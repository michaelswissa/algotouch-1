
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

serve(async (req) => {
  try {
    console.log("Webhook request received");
    
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Parse request data - support both URL params and JSON
    let paymentData;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      paymentData = await req.json();
      console.log("Received JSON webhook data");
    } else {
      // Handle application/x-www-form-urlencoded or query parameters
      const url = new URL(req.url);
      const params = req.method === 'POST' 
        ? new URLSearchParams(await req.text())
        : url.searchParams;
      
      // Convert URLSearchParams to object
      paymentData = {};
      for (const [key, value] of params.entries()) {
        paymentData[key] = value;
      }
      console.log("Received URL-encoded webhook data");
    }
    
    console.log("Payment webhook data:", paymentData);
    
    // Extract important data
    const lowProfileId = paymentData.LowProfileId || paymentData.lowProfileId || paymentData.lowprofileid || '';
    const operationResponse = paymentData.OperationResponse || paymentData.operationResponse || '';
    const transactionId = paymentData.TranzactionId || paymentData.InternalDealNumber || '';
    
    if (!lowProfileId) {
      console.error("Missing LowProfileId in webhook data");
      throw new Error('Missing LowProfileId in webhook data');
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check if this is a successful payment
    const isSuccessful = operationResponse === '0' || paymentData.ResponseCode === 0;
    
    // Get the payment session
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('id', lowProfileId)
      .single();
      
    if (sessionError) {
      console.error('Error retrieving payment session:', sessionError);
    }
    
    // Update payment logs with webhook data
    const status = isSuccessful ? 'completed' : 'failed';
    
    // Update existing log or create new one
    const { data: existingLog } = await supabaseClient
      .from('payment_logs')
      .select('id')
      .eq('lowprofile_id', lowProfileId)
      .maybeSingle();
      
    if (existingLog?.id) {
      // Update existing log
      await supabaseClient
        .from('payment_logs')
        .update({
          status,
          transaction_id: transactionId || null,
          payment_data: paymentData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLog.id);
    } else {
      // Create new log
      await supabaseClient
        .from('payment_logs')
        .insert({
          lowprofile_id: lowProfileId,
          user_id: sessionData?.user_id || null,
          status,
          transaction_id: transactionId || null,
          plan_id: sessionData?.plan_id || null,
          payment_data: paymentData
        });
    }
    
    // If successful payment, update user subscription
    if (isSuccessful && sessionData) {
      console.log("Processing successful payment for user:", sessionData.user_id);
      
      const userId = sessionData.user_id;
      const planId = sessionData.plan_id;
      const planDetails = sessionData.payment_details?.planDetails || {};
      
      // Only process if we have a user ID
      if (userId) {
        // Calculate subscription details based on plan
        const now = new Date();
        let trialEndsAt = null;
        let periodEndsAt = null;
        
        if (planId === 'monthly') {
          // Monthly plan with trial period
          trialEndsAt = new Date(now);
          trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month trial
          
          // After trial, subscription period is monthly
          periodEndsAt = new Date(trialEndsAt);
          periodEndsAt.setMonth(periodEndsAt.getMonth() + 1);
        } 
        else if (planId === 'annual') {
          // Annual plan, no trial
          periodEndsAt = new Date(now);
          periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
        }
        else if (planId === 'vip') {
          // VIP plan is permanent (set far in the future)
          periodEndsAt = new Date(now);
          periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 100);
        }
        
        // Check if user already has a subscription
        const { data: existingSubscription } = await supabaseClient
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (existingSubscription) {
          // Update existing subscription
          await supabaseClient
            .from('subscriptions')
            .update({
              plan_type: planId,
              status: planId === 'monthly' ? 'trial' : 'active',
              trial_ends_at: trialEndsAt?.toISOString() || null,
              current_period_ends_at: periodEndsAt?.toISOString() || null,
              payment_method: {
                provider: 'cardcom',
                transaction_id: transactionId,
                last_four: paymentData.CardNumber5 || null
              },
              updated_at: now.toISOString()
            })
            .eq('user_id', userId);
        } else {
          // Create new subscription
          await supabaseClient
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_type: planId,
              status: planId === 'monthly' ? 'trial' : 'active',
              trial_ends_at: trialEndsAt?.toISOString() || null,
              current_period_ends_at: periodEndsAt?.toISOString() || null,
              payment_method: {
                provider: 'cardcom',
                transaction_id: transactionId,
                last_four: paymentData.CardNumber5 || null
              }
            });
        }
        
        // Add payment record
        await supabaseClient
          .from('payment_history')
          .insert({
            user_id: userId,
            subscription_id: userId, // Using user_id as subscription_id for simplicity
            amount: paymentData.Sum36 || sessionData.payment_details?.amount || 0,
            currency: 'ILS',
            status: 'completed',
            payment_method: {
              provider: 'cardcom',
              transaction_id: transactionId,
              last_four: paymentData.CardNumber5 || null
            }
          })
          .catch(error => console.error('Error creating payment history:', error));
      }
    }
    
    // Return success response for Cardcom
    return new Response("OK", {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
