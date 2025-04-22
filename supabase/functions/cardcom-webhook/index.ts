
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client for database operations that bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload from CardCom
    let payload;
    try {
      payload = await req.json();
    } catch (error) {
      logStep("Invalid JSON payload", { error: error.message });
      return new Response("Invalid payload", { status: 400 });
    }

    logStep("Received webhook payload", payload);
    
    // Extract the required information from the payload
    const { 
      LowProfileId: lowProfileCode, 
      TranzactionInfo: transactionInfo, 
      ReturnValue: reference,
      TokenInfo: tokenInfo,
      TranzactionId: transactionId,
      ResponseCode: responseCode,
      Operation: operation
    } = payload;

    if (!lowProfileCode) {
      logStep("Missing lowProfileCode");
      return new Response("Missing lowProfileCode", { status: 400 });
    }

    // Query the payment session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .single();

    if (sessionError || !session) {
      logStep("Payment session not found", { lowProfileCode, error: sessionError?.message });
      return new Response("Payment session not found", { status: 404 });
    }

    const userId = session.user_id;
    if (!userId) {
      logStep("Anonymous payment not supported");
      return new Response("Anonymous payment not supported", { status: 400 });
    }

    // Check if payment was successful based on ResponseCode
    const isSuccess = responseCode === 0;
    const status = isSuccess ? 'success' : 'failed';
    
    // Update the payment session
    await supabaseAdmin
      .from('payment_sessions')
      .update({
        status,
        transaction_id: transactionId || (tokenInfo?.Token ? tokenInfo.Token : null),
        transaction_data: payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id);

    logStep("Updated payment session", { status });

    // If payment failed, log error and return
    if (!isSuccess) {
      await supabaseAdmin.from('payment_errors').insert({
        user_id: userId,
        error_code: responseCode.toString(),
        error_message: payload.Description || "Payment failed",
        response_data: payload
      });
      
      return new Response("Payment failed", { status: 200 });
    }

    // Handle successful payment or token creation
    const planId = session.plan_id;
    const operationType = session.operation_type || (planId === 'monthly' ? 'token_only' : 'payment');
    
    logStep("Processing successful payment", { planId, operationType });

    // Check for existing subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .not('status', 'eq', 'cancelled')
      .not('status', 'eq', 'expired')
      .single();

    // Prepare the payment method info from token or transaction
    let paymentMethodInfo = {};
    
    // Handle token creation (from TokenInfo object)
    if (tokenInfo?.Token) {
      paymentMethodInfo = {
        lastFourDigits: tokenInfo.CardNumberLastDigits || '',
        expiryMonth: tokenInfo.CardMonth || '',
        expiryYear: tokenInfo.CardYear || '',
        cardOwnerName: payload.UIValues?.CardOwnerName || '',
        cardOwnerPhone: payload.UIValues?.CardOwnerPhone || '',
        cardOwnerEmail: payload.UIValues?.CardOwnerEmail || '',
      };
    } 
    // Handle transaction info
    else if (transactionInfo) {
      paymentMethodInfo = {
        lastFourDigits: transactionInfo.Last4CardDigits || '',
        expiryMonth: transactionInfo.CardMonth || '',
        expiryYear: transactionInfo.CardYear || '',
        cardOwnerName: transactionInfo.CardOwnerName || payload.UIValues?.CardOwnerName || '',
        cardOwnerPhone: transactionInfo.CardOwnerPhone || payload.UIValues?.CardOwnerPhone || '',
        cardOwnerEmail: transactionInfo.CardOwnerEmail || payload.UIValues?.CardOwnerEmail || '',
      };
    }
    
    // Get user email for records
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    
    const userEmail = profile?.email || payload.UIValues?.CardOwnerEmail || '';

    // Handle payment result based on plan type and operation
    if (planId === 'monthly' || operationType === 'token_only') {
      // For monthly plans with token creation
      const token = tokenInfo?.Token;
      
      // Calculate the next charge date (30 days from today)
      const nextChargeDate = session.initial_next_charge_date || (() => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString();
      })();

      // Calculate the trial end date (30 days from today)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);

      if (existingSubscription) {
        // Update existing subscription with new token and extend period
        await supabaseAdmin
          .from('subscriptions')
          .update({
            plan_type: planId,
            status: 'trial',
            payment_token: token,
            payment_method: paymentMethodInfo,
            trial_ends_at: trialEndDate.toISOString(),
            next_charge_date: nextChargeDate,
            payment_status: 'pending_first_payment',
            first_payment_processed: false,
            payment_failures: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id);
      } else {
        // Create a new subscription
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: planId,
            status: 'trial',
            payment_token: token,
            payment_method: paymentMethodInfo,
            trial_ends_at: trialEndDate.toISOString(),
            next_charge_date: nextChargeDate,
            payment_status: 'pending_first_payment',
            first_payment_processed: false,
            payment_failures: 0,
            user_email: userEmail
          });
      }

      // Log the token creation
      await supabaseAdmin
        .from('user_payment_logs')
        .insert({
          user_id: userId,
          token: token || lowProfileCode,
          amount: 0, // No charge for token creation
          status: 'token_created',
          payment_data: {
            lowProfileCode,
            tokenInfo,
            paymentMethodInfo
          }
        });

    } else {
      // For annual and VIP plans with immediate payment
      const amount = session.amount;
      const token = tokenInfo?.Token;

      // Calculate period end date based on plan
      const periodEndDate = new Date();
      if (planId === 'annual') {
        periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
      }

      if (existingSubscription) {
        // Update existing subscription
        await supabaseAdmin
          .from('subscriptions')
          .update({
            plan_type: planId,
            status: 'active',
            payment_token: token,
            payment_method: paymentMethodInfo,
            payment_status: 'success',
            current_period_ends_at: planId === 'vip' ? null : periodEndDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id);
      } else {
        // Create a new subscription
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: planId,
            status: 'active',
            payment_token: token,
            payment_method: paymentMethodInfo,
            payment_status: 'success',
            current_period_ends_at: planId === 'vip' ? null : periodEndDate.toISOString(),
            user_email: userEmail
          });
      }

      // Log the payment
      await supabaseAdmin
        .from('user_payment_logs')
        .insert({
          user_id: userId,
          token: token || lowProfileCode,
          amount,
          status: 'payment_success',
          transaction_id: transactionId,
          payment_data: payload
        });
    }

    logStep("Subscription processed successfully");
    
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
