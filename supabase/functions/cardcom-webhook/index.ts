
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logStep, checkDuplicatePayment } from "../_shared/cardcom_utils.ts";

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'webhook';
    await logStep(functionName, "Webhook received");

    // Create Supabase client with admin privileges
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse webhook payload
    let payload;
    try {
      payload = await req.json();
      await logStep(functionName, "Received webhook data", payload);
    } catch (e) {
      await logStep(functionName, "Failed to parse webhook data", e, 'error', supabaseAdmin);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid webhook payload" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Validate required fields
    if (!payload?.LowProfileId || !payload?.ResponseCode) {
      await logStep(functionName, "Missing required webhook fields", payload, 'error', supabaseAdmin);
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Extract subscription data from webhook payload
    const {
      LowProfileId: lowProfileId,
      ResponseCode: responseCode,
      ReturnValue: reference,
      TranzactionId: transactionId,
      TokenInfo,
      Operation: operation
    } = payload;
    
    // Find the payment session
    const { data: paymentSession, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_id', lowProfileId)
      .maybeSingle();
    
    if (sessionError || !paymentSession) {
      await logStep(functionName, "Payment session not found", { error: sessionError?.message, lowProfileId }, 'error', supabaseAdmin);
      
      // Log this unmatched transaction
      await supabaseAdmin.from('payment_errors').insert({
        error_code: 'SESSION_NOT_FOUND',
        error_message: `No payment session found for LowProfileId: ${lowProfileId}`,
        response_data: payload
      });
      
      return new Response(
        JSON.stringify({ success: false, message: "Payment session not found" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if the session is already completed
    if (paymentSession.status === 'completed') {
      await logStep(functionName, "Session already completed", { sessionId: paymentSession.id });
      return new Response(
        JSON.stringify({ success: true, message: "Payment already processed" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Determine success/failure based on response code
    const isSuccess = responseCode === '0';
    const newStatus = isSuccess ? 'completed' : 'failed';
    
    // If successful payment, handle subscription creation or update
    if (isSuccess && paymentSession.user_id && paymentSession.plan_id) {
      try {
        // Get plan details
        const { data: planData } = await supabaseAdmin
          .from('plans')
          .select('*')
          .eq('id', paymentSession.plan_id)
          .single();
          
        if (planData) {
          const now = new Date();
          let trialEndsAt = null;
          let nextChargeAt = null;
          
          // Calculate next charge date based on plan type
          switch (paymentSession.plan_id) {
            case 'monthly':
              if (operation === "ChargeAndCreateToken") {
                // For monthly plans with free trial
                trialEndsAt = new Date(now);
                trialEndsAt.setDate(trialEndsAt.getDate() + 30);
                nextChargeAt = new Date(trialEndsAt);
              } else {
                // Regular monthly renewal
                nextChargeAt = new Date(now);
                nextChargeAt.setDate(nextChargeAt.getDate() + 30);
              }
              break;
            case 'annual':
              if (operation === "ChargeAndCreateToken") {
                // Initial annual payment
                nextChargeAt = new Date(now);
                nextChargeAt.setFullYear(nextChargeAt.getFullYear() + 1);
              }
              break;
            case 'vip':
              // VIP plans don't have recurring charges
              break;
          }
          
          // Extract token info for recurring payments
          const tokenInfo = TokenInfo || {};
          const paymentMethod = payload.TranzactionInfo || {};
          
          const subscriptionData = {
            user_id: paymentSession.user_id,
            plan_id: paymentSession.plan_id,
            status: paymentSession.plan_id === 'monthly' && operation === "ChargeAndCreateToken" ? 'trial' : 'active',
            plan_type: paymentSession.plan_id,
            trial_ends_at: trialEndsAt?.toISOString() || null,
            next_charge_at: nextChargeAt?.toISOString() || null,
            token: tokenInfo.Token || null,
            token_expires_ym: tokenInfo.TokenExDate ? 
              tokenInfo.TokenExDate.substring(0, 6) : null,
            payment_method: paymentMethod
          };

          // Check for existing subscription
          const { data: existingSubscription } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', paymentSession.user_id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (existingSubscription && existingSubscription.length > 0) {
            // Update existing subscription
            await supabaseAdmin
              .from('subscriptions')
              .update(subscriptionData)
              .eq('id', existingSubscription[0].id);
          } else {
            // Create new subscription
            await supabaseAdmin
              .from('subscriptions')
              .insert(subscriptionData);
          }
          
          // Store token for recurring payments if applicable
          if (tokenInfo.Token && ['monthly', 'annual'].includes(paymentSession.plan_id)) {
            const tokenExpiry = tokenInfo.TokenExDate ? 
              new Date(`20${tokenInfo.TokenExDate.substring(0, 2)}-${tokenInfo.TokenExDate.substring(2, 4)}-01`) : 
              new Date(now.getFullYear() + 2, now.getMonth());
              
            await supabaseAdmin
              .from('recurring_payments')
              .insert({
                user_id: paymentSession.user_id,
                token: tokenInfo.Token,
                status: 'active',
                token_expiry: tokenExpiry.toISOString(),
                last_4_digits: paymentMethod?.Last4CardDigits?.toString() || null,
                card_type: paymentMethod?.CardName || null,
                token_approval_number: tokenInfo.TokenApprovalNumber || null
              })
              .onConflict('token')
              .ignore();
          }
        }
      } catch (error) {
        await logStep(functionName, "Error handling subscription", error, 'error', supabaseAdmin);
      }
    }
    
    // Update payment session status
    await supabaseAdmin
      .from('payment_sessions')
      .update({
        status: newStatus,
        transaction_id: transactionId || null,
        transaction_data: payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentSession.id);
    
    await logStep(functionName, `Payment ${isSuccess ? 'succeeded' : 'failed'}`, {
      lowProfileId,
      sessionId: paymentSession.id,
      transactionId,
      responseCode
    });
    
    // Create log entry
    await supabaseAdmin.from('user_payment_logs').insert({
      user_id: paymentSession.user_id,
      token: lowProfileId,
      transaction_id: transactionId,
      amount: paymentSession.amount,
      status: isSuccess ? 'payment_success' : 'payment_failed',
      payment_data: payload,
      currency: paymentSession.currency || 'ILS'
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment ${isSuccess ? 'completed' : 'failed'} successfully`,
        data: { 
          status: newStatus,
          sessionId: paymentSession.id,
          lowProfileId,
          transactionId
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`[CARDCOM-WEBHOOK] Error: ${error instanceof Error ? error.message : String(error)}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
