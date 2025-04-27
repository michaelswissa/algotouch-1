
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECURRING-PAYMENTS] ${step}${detailsStr}`);
};

// This function will be called by a CRON job to handle recurring payments
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    logStep("Function started");
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    
    // Get CardCom credentials from environment
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD") || "i9nr6caGbgheTdYfQbo6";
    const cardcomUrl = "https://secure.cardcom.solutions";

    // Get query parameters (optional token for single subscription processing)
    const url = new URL(req.url);
    const subscriptionId = url.searchParams.get('subscriptionId');
    
    // Find subscriptions that need renewal (due for charge today or past due)
    const now = new Date().toISOString();
    
    let subscriptionsQuery = supabaseAdmin
      .from('subscriptions')
      .select(`
        id, 
        user_id,
        plan_type,
        next_charge_at,
        current_period_ends_at,
        payment_method,
        status
      `)
      .lte('next_charge_at', now) // Due today or past due
      .in('status', ['active', 'trial']) // Only active or trial subscriptions
      .not('plan_type', 'eq', 'vip'); // Exclude VIP subscriptions
    
    // If specific subscription ID provided, only process that one
    if (subscriptionId) {
      subscriptionsQuery = subscriptionsQuery.eq('id', subscriptionId);
    }
    
    const { data: subscriptions, error: subscriptionsError } = await subscriptionsQuery;
    
    if (subscriptionsError) {
      throw new Error(`Error fetching subscriptions: ${subscriptionsError.message}`);
    }
    
    logStep(`Found ${subscriptions?.length || 0} subscriptions to process`);
    
    // Results tracking
    const results = {
      total: subscriptions?.length || 0,
      succeeded: 0,
      failed: 0,
      details: [] as any[]
    };
    
    // Process each subscription
    for (const subscription of subscriptions || []) {
      try {
        logStep(`Processing subscription ${subscription.id} for plan ${subscription.plan_type}`);
        
        const paymentMethod = subscription.payment_method as any;
        
        // Skip if no valid payment method
        if (!paymentMethod?.token) {
          logStep(`Skipping subscription ${subscription.id} - no valid token`);
          results.details.push({
            id: subscription.id,
            status: 'skipped',
            message: 'No valid payment token'
          });
          continue;
        }
        
        // Calculate charge amount based on plan type
        let chargeAmount = 0;
        if (subscription.plan_type === 'monthly') {
          chargeAmount = 371.00;
        } else if (subscription.plan_type === 'annual') {
          chargeAmount = 3371.00;
        } else {
          logStep(`Skipping subscription ${subscription.id} - unsupported plan type ${subscription.plan_type}`);
          results.details.push({
            id: subscription.id,
            status: 'skipped',
            message: `Unsupported plan type: ${subscription.plan_type}`
          });
          continue;
        }
        
        // Prepare URL-encoded form data for token charge
        const formData = new URLSearchParams();
        formData.append('TerminalNumber', terminalNumber);
        formData.append('UserName', apiName);
        formData.append('TokenToCharge_Token', paymentMethod.token);
        formData.append('TokenToCharge_CardValidityMonth', paymentMethod.expiryMonth || '');
        formData.append('TokenToCharge_CardValidityYear', paymentMethod.expiryYear || '');
        formData.append('TokenToCharge_SumToBill', chargeAmount.toString());
        formData.append('TokenToCharge_APILevel', '10');
        formData.append('TokenToCharge_CoinID', '1'); // ILS
        formData.append('TokenToCharge_ProductName', `חידוש מנוי ${subscription.plan_type === 'monthly' ? 'חודשי' : 'שנתי'}`);
        formData.append('TokenToCharge_UserPassword', apiPassword);
        formData.append('TokenToCharge_IsRecurringPayment', 'true');
        
        logStep(`Sending charge request for subscription ${subscription.id}`);
        
        // Call CardCom API to charge the token
        const response = await fetch(`${cardcomUrl}/Interface/ChargeToken.aspx`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        });
        
        // Parse response
        const responseText = await response.text();
        const responseData = new URLSearchParams(responseText);
        
        const responseCode = responseData.get('ResponseCode');
        const internalDealNumber = responseData.get('InternalDealNumber');
        const responseDescription = responseData.get('Description');
        
        logStep(`CardCom response for subscription ${subscription.id}`, {
          responseCode,
          internalDealNumber,
          description: responseDescription
        });
        
        // Handle successful charge
        if (responseCode === '0') {
          logStep(`Charge successful for subscription ${subscription.id}`);
          results.succeeded++;
          
          // Calculate new billing period
          let nextChargeDate = new Date();
          let currentPeriodEndsAt = new Date();
          
          if (subscription.plan_type === 'monthly') {
            nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
            currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
          } else if (subscription.plan_type === 'annual') {
            nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
            currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
          }
          
          // Update subscription with new dates
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'active',
              trial_ends_at: null, // No longer in trial
              next_charge_at: nextChargeDate.toISOString(),
              current_period_ends_at: currentPeriodEndsAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);
          
          // Log successful payment
          await supabaseAdmin
            .from('payment_logs')
            .insert({
              user_id: subscription.user_id,
              transaction_id: internalDealNumber || '',
              amount: chargeAmount,
              currency: 'ILS',
              plan_id: subscription.plan_type,
              payment_status: 'succeeded',
              payment_data: Object.fromEntries(responseData.entries())
            });
            
          results.details.push({
            id: subscription.id,
            status: 'success',
            transactionId: internalDealNumber,
            nextChargeDate: nextChargeDate.toISOString()
          });
        } else {
          // Handle failed charge
          logStep(`Charge failed for subscription ${subscription.id}`, { 
            responseCode, 
            description: responseDescription 
          });
          results.failed++;
          
          // Increment fail count on subscription
          const { data: subData } = await supabaseAdmin
            .from('subscriptions')
            .select('fail_count')
            .eq('id', subscription.id)
            .single();
          
          const failCount = (subData?.fail_count || 0) + 1;
          const newStatus = failCount >= 3 ? 'suspended' : subscription.status;
          
          // Update subscription with fail count
          await supabaseAdmin
            .from('subscriptions')
            .update({
              fail_count: failCount,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);
            
          // Log failed payment
          await supabaseAdmin
            .from('payment_logs')
            .insert({
              user_id: subscription.user_id,
              transaction_id: internalDealNumber || '',
              amount: chargeAmount,
              currency: 'ILS',
              plan_id: subscription.plan_type,
              payment_status: 'failed',
              payment_data: Object.fromEntries(responseData.entries())
            });
            
          results.details.push({
            id: subscription.id,
            status: 'failed',
            failCount,
            newStatus,
            error: responseDescription || 'Unknown error'
          });
        }
      } catch (subError) {
        logStep(`Error processing subscription ${subscription.id}`, { 
          error: subError.message 
        });
        results.failed++;
        results.details.push({
          id: subscription.id,
          status: 'error',
          message: subError.message
        });
      }
    }
    
    logStep("Processing complete", {
      total: results.total,
      succeeded: results.succeeded,
      failed: results.failed
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.total} subscriptions: ${results.succeeded} succeeded, ${results.failed} failed`,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    logStep("ERROR processing recurring payments", { error: error.message });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error processing recurring payments: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
