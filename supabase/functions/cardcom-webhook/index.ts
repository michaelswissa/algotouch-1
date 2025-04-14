
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

serve(async (req) => {
  try {
    console.log("Webhook request received");
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }
    
    // Get the webhook data
    let paymentData;
    
    try {
      // Try parsing as JSON first
      paymentData = await req.json();
    } catch (jsonError) {
      console.log("Not JSON, trying URL parameters", jsonError);
      
      // Parse URL parameters from either body or URL
      const url = new URL(req.url);
      paymentData = {};
      
      // Get params from URL query string
      for (const [key, value] of url.searchParams.entries()) {
        paymentData[key] = value;
      }
      
      // If it's a POST request, try to get form data
      if (req.method === 'POST') {
        try {
          const formData = await req.formData();
          for (const [key, value] of formData.entries()) {
            paymentData[key] = value;
          }
        } catch (formError) {
          console.log("Not form data either", formError);
          
          // Try getting text and parsing as URL-encoded
          try {
            const text = await req.text();
            console.log("Raw request body:", text);
            
            const params = new URLSearchParams(text);
            for (const [key, value] of params.entries()) {
              paymentData[key] = value;
            }
          } catch (textError) {
            console.error("Error parsing request body:", textError);
          }
        }
      }
    }
    
    console.log("Webhook payment data:", paymentData);
    
    // Validate we have the minimum required data
    if (!paymentData || !paymentData.LowProfileCode) {
      console.error("Missing required payment data in webhook");
      return new Response(
        JSON.stringify({ success: false, error: "Missing required payment data" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    const lowProfileId = paymentData.LowProfileCode;
    const operationResponse = paymentData.OperationResponse;
    
    console.log(`Processing webhook for lowProfileId: ${lowProfileId}, response: ${operationResponse}`);
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get the existing payment session
    const { data: session, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('id', lowProfileId)
      .maybeSingle();
    
    if (sessionError || !session) {
      console.error('Payment session not found:', sessionError);
      
      // Still log the webhook even if we can't find the session
      await supabaseClient
        .from('payment_logs')
        .insert({
          lowprofile_id: lowProfileId,
          status: operationResponse === '0' ? 'completed' : 'failed',
          payment_data: paymentData,
          transaction_id: paymentData.TranzactionId || paymentData.InternalDealNumber
        })
        .catch(error => console.error('Error logging webhook:', error));
      
      return new Response(
        JSON.stringify({ success: false, error: "Payment session not found" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Return 200 so Cardcom doesn't retry
        }
      );
    }
    
    // Determine transaction status
    const isSuccess = operationResponse === '0' || 
                     (paymentData.TranzactionInfo && paymentData.TranzactionInfo.ResponseCode === 0);
    
    const status = isSuccess ? 'completed' : 'failed';
    
    // Update payment logs
    await supabaseClient
      .from('payment_logs')
      .insert({
        lowprofile_id: lowProfileId,
        user_id: session.user_id,
        status: status,
        plan_id: session.plan_id,
        payment_data: paymentData,
        transaction_id: paymentData.TranzactionId || paymentData.InternalDealNumber
      })
      .catch(error => console.error('Error logging webhook:', error));
    
    // For successful payments, create or update subscription
    if (isSuccess && session.user_id) {
      const planId = session.plan_id;
      const email = session.email;
      const userId = session.user_id;
      
      // Process successful payment
      const now = new Date();
      let trialEndsAt = null;
      let currentPeriodEndsAt = null;
      
      if (planId === 'monthly') {
        // Free trial for monthly plan
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30-day trial
        
        currentPeriodEndsAt = new Date(trialEndsAt);
        currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
      } else if (planId === 'annual') {
        currentPeriodEndsAt = new Date(now);
        currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
      }
      
      // Get payment method details from the transaction
      const paymentMethod = {
        lastFourDigits: paymentData.CardNumber5 || 
                        (paymentData.TranzactionInfo && paymentData.TranzactionInfo.Last4CardDigitsString),
        cardType: paymentData.Mutag_24 || 
                  (paymentData.TranzactionInfo && paymentData.TranzactionInfo.Brand),
        token: paymentData.Token || 
               (paymentData.TokenInfo && paymentData.TokenInfo.Token)
      };
      
      // Update subscription
      const { error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_type: planId,
          status: planId === 'monthly' ? 'trial' : planId === 'vip' ? 'active' : 'active',
          trial_ends_at: trialEndsAt?.toISOString() || null,
          current_period_ends_at: currentPeriodEndsAt?.toISOString() || null,
          payment_method: paymentMethod,
          contract_signed: true,
          contract_signed_at: now.toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (subscriptionError) {
        console.error('Error updating subscription:', subscriptionError);
      }
      
      // Record payment transaction if not a trial
      if (planId !== 'monthly' || paymentData.Amount > 0) {
        await supabaseClient
          .from('payment_history')
          .insert({
            user_id: userId,
            subscription_id: userId, // Using user_id as subscription_id
            amount: paymentData.Amount || session.payment_details?.amount || 0,
            currency: 'ILS',
            status: 'completed',
            payment_method: paymentMethod,
            payment_date: now.toISOString()
          })
          .catch(error => console.error('Error recording payment history:', error));
      }
    }
    
    // Return 200 OK to Cardcom
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return 200 even on error so Cardcom doesn't retry
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
