import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function for logging
async function logStep(
  functionName: string,
  step: string, 
  details?: any, 
  level: 'info' | 'warn' | 'error' = 'info',
  supabaseAdmin?: any
) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  const prefix = `[CARDCOM-${functionName.toUpperCase()}][${level.toUpperCase()}][${timestamp}]`;
  
  console.log(`${prefix} ${step}${detailsStr}`);
  
  // Store critical logs in database
  if (level === 'error' && supabaseAdmin) {
    try {
      await supabaseAdmin.from('system_logs').insert({
        function_name: `cardcom-${functionName}`,
        level,
        message: step,
        details: details || {},
        created_at: timestamp
      });
    } catch (e) {
      console.error('Failed to log to database:', e);
    }
  }
}

// Process a single subscription for recurring payment
async function processSubscription(subscription: any, supabaseAdmin: any) {
  const functionName = 'recurring-process';
  await logStep(functionName, `Processing subscription: ${subscription.id}`, {
    userId: subscription.user_id,
    planId: subscription.plan_id
  });
  
  try {
    // Get valid token for the user
    const { data: tokenData } = await supabaseAdmin
      .from('recurring_payments')
      .select('*')
      .eq('user_id', subscription.user_id)
      .eq('is_valid', true)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (!tokenData || tokenData.length === 0) {
      await logStep(functionName, "No valid token found", { subscriptionId: subscription.id }, 'error', supabaseAdmin);
      return { success: false, error: "No valid token found for recurring payment" };
    }
    
    const token = tokenData[0];
    
    // Get plan details
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single();
      
    if (!plan) {
      await logStep(functionName, "Plan not found", { subscriptionId: subscription.id, planId: subscription.plan_id }, 'error', supabaseAdmin);
      return { success: false, error: "Plan not found" };
    }
    
    // Get CardCom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    
    if (!terminalNumber || !apiName) {
      await logStep(functionName, "Missing CardCom API configuration", { subscriptionId: subscription.id }, 'error', supabaseAdmin);
      return { success: false, error: "Missing CardCom API configuration" };
    }
    
    // Get user email for the invoice
    const { data: userData } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', subscription.user_id)
      .single();
      
    const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(subscription.user_id);
    
    const fullName = userData && (userData.first_name || userData.last_name) ? 
      `${userData.first_name || ''} ${userData.last_name || ''}`.trim() : 
      'Customer';
      
    const email = userAuth?.user?.email || '';
    
    // Generate transaction reference
    const transactionRef = `recurring-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare CardCom API payload
    const cardcomPayload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      Token: token.token,
      Amount: plan.price,
      ExternalUniqUniqTranIdResponse: true,
      ExternalUniqTranId: transactionRef,
      Document: {
        DocumentTypeToCreate: "Receipt",
        Name: fullName,
        Email: email
      }
    };
    
    // Call CardCom API for recurring payment
    const cardcomResponse = await fetch('https://secure.cardcom.solutions/api/v11/Transaction/DoTransaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardcomPayload)
    });
    
    const response = await cardcomResponse.json();
    await logStep(functionName, "CardCom API response", response);
    
    const isSuccess = response.ResponseCode === 0;
    
    // Create a payment log entry
    await supabaseAdmin.from('user_payment_logs').insert({
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      token: token.token,
      transaction_id: response.TranzactionId || null,
      amount: plan.price,
      currency: 'ILS',
      status: isSuccess ? 'payment_success' : 'payment_failed',
      payment_data: response
    });
    
    // Update subscription based on payment result
    if (isSuccess) {
      // Calculate next charge date
      const nextChargeDate = new Date();
      nextChargeDate.setDate(nextChargeDate.getDate() + (plan.cycle_days || 30));
      
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          fail_count: 0,
          next_charge_at: nextChargeDate.toISOString()
        })
        .eq('id', subscription.id);
        
      await logStep(functionName, "Subscription renewed successfully", {
        subscriptionId: subscription.id,
        nextChargeAt: nextChargeDate.toISOString()
      });
      
      return { success: true, data: response };
    } else {
      // Increment fail count
      const newFailCount = (subscription.fail_count || 0) + 1;
      const newStatus = newFailCount >= 3 ? 'suspended' : subscription.status;
      
      await supabaseAdmin
        .from('subscriptions')
        .update({
          fail_count: newFailCount,
          status: newStatus
        })
        .eq('id', subscription.id);
        
      await logStep(functionName, "Payment failed", {
        subscriptionId: subscription.id,
        failCount: newFailCount,
        newStatus
      }, 'error', supabaseAdmin);
      
      // If fail count is too high, invalidate the token
      if (newFailCount >= 3) {
        await supabaseAdmin
          .from('recurring_payments')
          .update({ is_valid: false })
          .eq('id', token.id);
          
        await logStep(functionName, "Token invalidated due to multiple failures", {
          tokenId: token.id,
          subscriptionId: subscription.id
        }, 'warn', supabaseAdmin);
      }
      
      return { success: false, error: response.Description, data: response };
    }
  } catch (error) {
    await logStep(functionName, "Error processing subscription", { 
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : String(error)
    }, 'error', supabaseAdmin);
    
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'recurring';
    await logStep(functionName, "Function started");
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create authenticated client if Authorization header is present
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = authHeader ? 
      createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
        global: { headers: { Authorization: authHeader } }
      }) : null;
    
    // Parse request body
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      // If parsing fails, assume it's a cron job with no body
      requestBody = { action: 'process_due' };
    }
    
    const { action, subscriptionId, userId } = requestBody;
    
    // Handle different actions
    switch (action) {
      case 'cancel': {
        // Validate authentication for cancel operation
        if (!supabaseClient) {
          return new Response(
            JSON.stringify({ success: false, message: "Authentication required" }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get user ID from authenticated client if not provided
        let targetUserId = userId;
        if (!targetUserId) {
          const { data: userData } = await supabaseClient.auth.getUser();
          targetUserId = userData?.user?.id;
        }
        
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ success: false, message: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Only allow users to cancel their own subscriptions unless admin
        if (!subscriptionId) {
          return new Response(
            JSON.stringify({ success: false, message: "Subscription ID is required" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get the subscription
        const { data: subscription, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();
          
        if (subError || !subscription) {
          await logStep(functionName, "Subscription not found", { subscriptionId }, 'error', supabaseAdmin);
          
          return new Response(
            JSON.stringify({ success: false, message: "Subscription not found" }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if user owns the subscription or is admin
        const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { user_id: targetUserId });
        
        if (subscription.user_id !== targetUserId && !isAdmin) {
          await logStep(functionName, "Unauthorized subscription cancellation attempt", {
            subscriptionId,
            requestUserId: targetUserId,
            subscriptionUserId: subscription.user_id
          }, 'warn', supabaseAdmin);
          
          return new Response(
            JSON.stringify({ success: false, message: "Not authorized to cancel this subscription" }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Cancel the subscription
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', subscriptionId);
          
        await logStep(functionName, "Subscription cancelled", { subscriptionId, userId: targetUserId });
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription cancelled successfully"
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'process_due':
      default: {
        // This is the cron job entry point - get all subscriptions due for renewal
        const now = new Date().toISOString();
        
        const { data: dueSubscriptions, error: queryError } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .in('status', ['active', 'trial'])
          .lt('next_charge_at', now)
          .order('next_charge_at', { ascending: true })
          .limit(50); // Process in batches
        
        if (queryError) {
          await logStep(functionName, "Error querying due subscriptions", queryError, 'error', supabaseAdmin);
          
          return new Response(
            JSON.stringify({ success: false, message: "Error querying due subscriptions" }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        await logStep(functionName, `Found ${dueSubscriptions?.length || 0} subscriptions due for renewal`);
        
        if (!dueSubscriptions || dueSubscriptions.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              message: "No subscriptions due for renewal",
              data: { processed: 0 }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Process each subscription
        const results = await Promise.all(
          dueSubscriptions.map(subscription => processSubscription(subscription, supabaseAdmin))
        );
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        await logStep(functionName, `Processed ${dueSubscriptions.length} subscriptions`, {
          successful,
          failed
        });
        
        // Also handle trial expirations
        try {
          await supabaseAdmin.rpc('update_expired_trials');
          await logStep(functionName, "Updated expired trials");
        } catch (trialError) {
          await logStep(functionName, "Error updating expired trials", trialError, 'error', supabaseAdmin);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `Processed ${dueSubscriptions.length} subscriptions`,
            data: {
              processed: dueSubscriptions.length,
              successful,
              failed,
              results
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CARDCOM-RECURRING][ERROR] ${errorMessage}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
