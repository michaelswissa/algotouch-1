
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

serve(async (req) => {
  try {
    console.log("Webhook request received");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }
    
    // Parse webhook data
    let paymentData: any;
    try {
      let contentType = req.headers.get('content-type') || '';
      const text = await req.text();
      console.log("Raw webhook payload:", text);
      
      if (contentType.includes('application/json')) {
        // Try parsing as JSON
        paymentData = JSON.parse(text);
      } else {
        // Parse URL parameters (form data format)
        const params = new URLSearchParams(text);
        paymentData = Object.fromEntries(params.entries());
      }
      
      // Additional parsing for Cardcom's nested structures 
      if (typeof paymentData === 'object') {
        // Convert string "true"/"false" values to booleans
        Object.keys(paymentData).forEach(key => {
          if (paymentData[key] === 'true') paymentData[key] = true;
          if (paymentData[key] === 'false') paymentData[key] = false;
          
          // Try to convert numeric strings to actual numbers
          const num = Number(paymentData[key]);
          if (!isNaN(num) && String(num) === paymentData[key]) {
            paymentData[key] = num;
          }
        });
      }
    } catch (error) {
      console.error("Error processing webhook payload:", error);
      throw new Error(`Invalid webhook payload: ${error.message}`);
    }
    
    console.log("Processed payment data:", paymentData);
    
    // Identify the payment session - try multiple possible field names
    // Cardcom uses different field names in different contexts
    const lowProfileId = paymentData.LowProfileCode || 
                         paymentData.lowProfileId || 
                         paymentData.ReturnValue || 
                         paymentData.returnValue;
                         
    if (!lowProfileId) {
      console.error("Missing transaction identifier in webhook payload:", paymentData);
      throw new Error('Missing required transaction identifier');
    }

    // Determine transaction success status - check multiple possible field formats
    const isSuccess = (
      paymentData.OperationResponse === '0' || paymentData.OperationResponse === 0 ||
      (paymentData.TranzactionInfo && paymentData.TranzactionInfo.ResponseCode === 0) ||
      (paymentData.ResponseCode === 0) ||
      (paymentData.DealsResponses && paymentData.DealsResponses.some(dr => dr.ResponseCode === 0))
    );
    
    console.log(`Processing webhook for ID: ${lowProfileId}, success: ${isSuccess}`);
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get existing session
    const { data: session, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('id', lowProfileId)
      .maybeSingle();
    
    if (sessionError) {
      console.error('Error fetching payment session:', sessionError);
      // Don't throw here, we might still want to log the webhook
    }
    
    // Extract useful payment info
    const transactionId = paymentData.TranzactionId || 
                         (paymentData.TranzactionInfo && paymentData.TranzactionInfo.TranzactionId) || 
                         null;
                         
    const cardLastDigits = paymentData.CardNumber5 || 
                          (paymentData.TranzactionInfo && paymentData.TranzactionInfo.Last4CardDigitsString) || 
                          null;
                          
    const cardType = paymentData.Mutag_24 || 
                    (paymentData.TranzactionInfo && paymentData.TranzactionInfo.Brand) || 
                    null;
                    
    const token = paymentData.Token || 
                 (paymentData.TokenInfo && paymentData.TokenInfo.Token) || 
                 null;
    
    // Update payment logs regardless of session status
    try {
      await supabaseClient
        .from('payment_logs')
        .insert({
          lowprofile_id: lowProfileId,
          user_id: session?.user_id || null,
          status: isSuccess ? 'completed' : 'failed',
          plan_id: session?.plan_id || null,
          transaction_id: transactionId,
          payment_data: paymentData
        });
      console.log(`Payment log created for transaction ${lowProfileId}`);
    } catch (logError) {
      console.error('Error creating payment log:', logError);
    }
    
    // If successful, update subscription (only if we have session data)
    if (isSuccess && session?.user_id) {
      try {
        const planId = session.plan_id;
        const now = new Date();
        let trialEndsAt = null;
        let currentPeriodEndsAt = null;
        
        if (planId === 'monthly') {
          // 30-day trial then charge monthly
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);
          currentPeriodEndsAt = new Date(trialEndsAt);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
        } else if (planId === 'annual') {
          // Charge annually from now
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
        } else if (planId === 'vip') {
          // VIP is lifetime access
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 100); // Effectively forever
        }
        
        // Get existing subscription if any
        const { data: existingSubscription } = await supabaseClient
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user_id)
          .maybeSingle();
        
        // Payment method details
        const paymentMethod = {
          lastFourDigits: cardLastDigits,
          cardType: cardType,
          token: token
        };
        
        // Update or create subscription
        const { error: subscriptionError } = await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: session.user_id,
            plan_type: planId,
            status: planId === 'monthly' && !existingSubscription ? 'trial' : 'active',
            trial_ends_at: trialEndsAt?.toISOString(),
            current_period_ends_at: currentPeriodEndsAt?.toISOString(),
            payment_method: paymentMethod
          }, {
            onConflict: 'user_id'
          });
        
        if (subscriptionError) {
          console.error('Error updating subscription:', subscriptionError);
        } else {
          console.log(`Subscription updated for user ${session.user_id} with plan ${planId}`);
        }
        
        // Record payment history
        try {
          await supabaseClient
            .from('payment_history')
            .insert({
              user_id: session.user_id,
              subscription_id: session.user_id,
              amount: (session.payment_details?.amount) || 0,
              currency: 'ILS',
              status: 'completed',
              payment_method: {
                lastFourDigits: cardLastDigits,
                cardType: cardType
              }
            });
          console.log(`Payment history recorded for user ${session.user_id}`);
        } catch (historyError) {
          console.error('Error recording payment history:', historyError);
        }
      } catch (subscriptionProcessingError) {
        console.error('Error processing subscription update:', subscriptionProcessingError);
      }
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Return 200 even on error so Cardcom doesn't retry
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
