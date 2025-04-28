import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";

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
    
    // Extract important values from webhook
    const {
      LowProfileId: lowProfileId,
      ResponseCode: responseCode,
      ReturnValue: reference,
      TranzactionId: transactionId
    } = payload;
    
    // Check for duplicate processing with new implementation
    const duplicateCheck = await checkDuplicatePayment(supabaseAdmin, lowProfileId, transactionId);
    if (duplicateCheck.exists) {
      await logStep(functionName, "Detected duplicate payment", duplicateCheck, 'warn');
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Duplicate payment webhook - already processed",
          data: duplicateCheck 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Find the relevant payment session
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
    
    // If successful payment, handle subscription creation or update
    if (isSuccess && paymentSession.user_id && paymentSession.plan_id) {
      try {
        // Get the selected plan details from the database
        const { data: planData } = await supabaseAdmin
          .from('plans')
          .select('*')
          .eq('id', paymentSession.plan_id)
          .single();
          
        if (planData) {
          // Check if user already has a subscription
          const { data: existingSubscription } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', paymentSession.user_id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          const now = new Date();
          let trialEndsAt = null;
          let nextChargeAt = null;
          
          // Calculate trial and next charge dates
          if (planData.has_trial && planData.trial_days > 0 && planData.id !== 'vip') {
            trialEndsAt = new Date(now);
            trialEndsAt.setDate(trialEndsAt.getDate() + planData.trial_days);
            nextChargeAt = new Date(trialEndsAt);
          } else if (planData.id !== 'vip') {
            // For non-VIP plans with no trial, set next charge date based on cycle_days
            nextChargeAt = new Date(now);
            nextChargeAt.setDate(nextChargeAt.getDate() + (planData.cycle_days || 30));
          }
          
          // Extract token info for recurring payments
          const tokenInfo = payload.TokenInfo || {};
          const paymentMethod = payload.TranzactionInfo || {};
          
          let subscriptionData = {
            user_id: paymentSession.user_id,
            plan_id: paymentSession.plan_id,
            status: planData.has_trial && planData.id !== 'vip' ? 'trial' : 'active',
            plan_type: paymentSession.plan_id,
            trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
            next_charge_at: nextChargeAt ? nextChargeAt.toISOString() : null,
            token: tokenInfo.Token || null,
            token_expires_ym: tokenInfo.TokenExDate ? 
              tokenInfo.TokenExDate.substring(0, 6) : null,
            payment_method: paymentMethod
          };
          
          // VIP plans don't expire or have recurring charges
          if (paymentSession.plan_id === 'vip') {
            subscriptionData = {
              ...subscriptionData,
              status: 'active',
              trial_ends_at: null,
              next_charge_at: null
            };
          }
          
          if (existingSubscription && existingSubscription.length > 0) {
            // Update existing subscription
            await supabaseAdmin
              .from('subscriptions')
              .update(subscriptionData)
              .eq('id', existingSubscription[0].id);
              
            await logStep(functionName, "Subscription updated", { 
              subscriptionId: existingSubscription[0].id,
              planId: paymentSession.plan_id
            });
          } else {
            // Create new subscription
            const { data: newSubscription, error: subError } = await supabaseAdmin
              .from('subscriptions')
              .insert(subscriptionData)
              .select()
              .single();
              
            if (subError) {
              await logStep(functionName, "Failed to create subscription", subError, 'error', supabaseAdmin);
            } else {
              await logStep(functionName, "New subscription created", { 
                subscriptionId: newSubscription.id,
                planId: paymentSession.plan_id
              });
            }
          }
          
          // If token was created, store it for recurring payments
          if (tokenInfo.Token && planData.id !== 'vip') {
            const tokenExpiry = tokenInfo.TokenExDate ? 
              new Date(`20${tokenInfo.TokenExDate.substring(0, 2)}-${tokenInfo.TokenExDate.substring(2, 4)}-01`) : 
              new Date(now.getFullYear() + 2, now.getMonth());
              
            await supabaseAdmin.from('recurring_payments').insert({
              user_id: paymentSession.user_id,
              token: tokenInfo.Token,
              status: 'active',
              token_expiry: tokenExpiry.toISOString(),
              last_4_digits: paymentMethod?.Last4CardDigits?.toString() || null,
              card_type: paymentMethod?.CardName || null,
              token_approval_number: tokenInfo.TokenApprovalNumber || null
            }).onConflict('token').ignore();
            
            await logStep(functionName, "Recurring payment token stored", { 
              userId: paymentSession.user_id,
              token: tokenInfo.Token
            });
          }
        }
      } catch (subscriptionError) {
        await logStep(functionName, "Error handling subscription", subscriptionError, 'error', supabaseAdmin);
      }
    }
    
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
