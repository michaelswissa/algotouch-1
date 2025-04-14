
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  try {
    console.log("Webhook request received");
    console.log("Request method:", req.method);
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }
    
    // Parse webhook data
    let paymentData;
    try {
      const text = await req.text();
      console.log("Raw webhook payload:", text);
      
      try {
        // Try parsing as JSON first
        paymentData = JSON.parse(text);
      } catch (jsonError) {
        // Parse URL parameters if not JSON
        const params = new URLSearchParams(text);
        paymentData = Object.fromEntries(params.entries());
      }
    } catch (error) {
      console.error("Error processing webhook payload:", error);
      throw new Error('Invalid webhook payload');
    }
    
    console.log("Processed payment data:", paymentData);
    
    if (!paymentData || (!paymentData.LowProfileCode && !paymentData.lowProfileId)) {
      throw new Error('Missing required payment data');
    }

    // Get payment session ID
    const lowProfileId = paymentData.LowProfileCode || paymentData.lowProfileId;
    const operationResponse = paymentData.OperationResponse;
    
    console.log(`Processing webhook for ID: ${lowProfileId}, response: ${operationResponse}`);
    
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
      .single();
    
    if (sessionError || !session) {
      console.error('Error fetching payment session:', sessionError);
      throw new Error('Payment session not found');
    }
    
    // Determine status
    const isSuccess = operationResponse === '0' || 
                     (paymentData.TranzactionInfo && paymentData.TranzactionInfo.ResponseCode === 0);
    
    // Update payment logs
    await supabaseClient
      .from('payment_logs')
      .insert({
        lowprofile_id: lowProfileId,
        user_id: session.user_id,
        status: isSuccess ? 'completed' : 'failed',
        plan_id: session.plan_id,
        payment_data: paymentData
      });
    
    // If successful, update subscription
    if (isSuccess && session.user_id) {
      const planId = session.plan_id;
      const now = new Date();
      let trialEndsAt = null;
      let currentPeriodEndsAt = null;
      
      if (planId === 'monthly') {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 30);
        currentPeriodEndsAt = new Date(trialEndsAt);
        currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
      } else {
        currentPeriodEndsAt = new Date(now);
        currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
      }
      
      // Update subscription
      const { error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: session.user_id,
          plan_type: planId,
          status: planId === 'monthly' ? 'trial' : 'active',
          trial_ends_at: trialEndsAt?.toISOString(),
          current_period_ends_at: currentPeriodEndsAt?.toISOString(),
          payment_method: {
            lastFourDigits: paymentData.CardNumber5,
            cardType: paymentData.Mutag_24,
            token: paymentData.Token
          }
        }, {
          onConflict: 'user_id'
        });
      
      if (subscriptionError) {
        console.error('Error updating subscription:', subscriptionError);
      }
      
      // Record payment history
      await supabaseClient
        .from('payment_history')
        .insert({
          user_id: session.user_id,
          subscription_id: session.user_id,
          amount: session.payment_details?.amount || 0,
          currency: 'ILS',
          status: 'completed',
          payment_method: {
            lastFourDigits: paymentData.CardNumber5,
            cardType: paymentData.Mutag_24
          }
        });
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
