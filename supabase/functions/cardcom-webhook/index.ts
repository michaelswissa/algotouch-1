
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
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
    logStep("Function started");
    
    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get webhook data - CardCom sends data in request body
    let webhookData;
    
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      webhookData = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      webhookData = Object.fromEntries(formData.entries());
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }
    
    logStep("Received webhook data", webhookData);
    
    // Extract required fields from webhook data
    const { 
      LowProfileId: lowProfileCode,
      OperationResponse: operationResponse,
      ReturnValue: returnValue,
      InternalDealNumber: transactionId,
      TranzactionInfo: transactionInfo,
      TokenInfo: tokenInfo
    } = webhookData;
    
    if (!lowProfileCode) {
      throw new Error("Missing LowProfileId in webhook data");
    }
    
    // Check if this webhook has already been processed (to prevent duplicate processing)
    const isDuplicate = await supabaseAdmin.rpc('check_duplicate_payment', { low_profile_id: lowProfileCode });
    if (isDuplicate.data) {
      logStep("Duplicate webhook detected, skipping processing", { lowProfileCode });
      return new Response("OK - Duplicate webhook", { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }
    
    // Find matching payment session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .single();
      
    if (sessionError || !sessionData) {
      throw new Error(`Payment session not found for LowProfileId: ${lowProfileCode}`);
    }
    
    logStep("Found payment session", { 
      sessionId: sessionData.id,
      userId: sessionData.user_id,
      planId: sessionData.plan_id
    });
    
    // Extract token information if available
    let paymentMethod = null;
    if (tokenInfo) {
      paymentMethod = {
        token: tokenInfo.Token,
        tokenExpiryDate: tokenInfo.TokenExDate,
        lastFourDigits: webhookData.CardNumber5 || "0000",
        expiryMonth: tokenInfo.CardValidityMonth,
        expiryYear: tokenInfo.CardValidityYear
      };
    }
    
    // Update payment status
    const isSuccessful = operationResponse === "0";
    const status = isSuccessful ? 'completed' : 'failed';
    
    const updateData: any = {
      status,
      transaction_id: transactionId,
      transaction_data: webhookData
    };
    
    if (paymentMethod) {
      updateData.payment_method = paymentMethod;
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('payment_sessions')
      .update(updateData)
      .eq('id', sessionData.id);
      
    if (updateError) {
      throw new Error(`Failed to update payment session: ${updateError.message}`);
    }
    
    logStep("Updated payment session status", { status });
    
    // Log the transaction
    const logTable = isSuccessful ? 'payment_logs' : 'payment_errors';
    
    const logData = isSuccessful 
      ? {
          user_id: sessionData.user_id,
          transaction_id: transactionId,
          amount: sessionData.amount,
          currency: sessionData.currency,
          plan_id: sessionData.plan_id,
          payment_status: 'succeeded',
          payment_data: webhookData 
        }
      : { 
          user_id: sessionData.user_id,
          error_code: operationResponse,
          error_message: webhookData.Description || 'Payment failed',
          request_data: { low_profile_code: lowProfileCode, return_value: returnValue },
          response_data: webhookData
        };
    
    const { error: logError } = await supabaseAdmin
      .from(logTable)
      .insert(logData);
    
    if (logError) {
      logStep("Error logging transaction", { error: logError.message });
    }
    
    // If payment successful, update subscription record
    if (isSuccessful) {
      try {
        // Calculate trial/subscription periods
        const now = new Date();
        const planId = sessionData.plan_id;
        
        let trialEndsAt = null;
        let nextChargeDate = null;
        let currentPeriodEndsAt = null;
        
        // Set appropriate dates based on plan type
        if (planId === 'monthly') {
          // Monthly plan with trial
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial
          
          nextChargeDate = new Date(trialEndsAt);
          currentPeriodEndsAt = new Date(nextChargeDate);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
        } else if (planId === 'annual') {
          // Annual plan with trial
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
          
          nextChargeDate = new Date(trialEndsAt);
          currentPeriodEndsAt = new Date(nextChargeDate);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
        } else if (planId === 'vip') {
          // VIP plan - no trial, lifetime access
          currentPeriodEndsAt = null; // Never expires
          nextChargeDate = null; // No recurring charge
        }
        
        // Create or update subscription record
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('user_id', sessionData.user_id)
          .maybeSingle();
        
        if (existingSubscription) {
          // Update existing subscription
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan_type: planId,
              status: planId === 'vip' ? 'active' : 'trial',
              next_charge_date: nextChargeDate,
              trial_ends_at: trialEndsAt,
              current_period_ends_at: currentPeriodEndsAt,
              payment_method: paymentMethod,
              updated_at: now.toISOString()
            })
            .eq('id', existingSubscription.id);
        } else {
          // Create new subscription
          await supabaseAdmin
            .from('subscriptions')
            .insert({
              user_id: sessionData.user_id,
              plan_type: planId,
              status: planId === 'vip' ? 'active' : 'trial',
              next_charge_date: nextChargeDate,
              trial_ends_at: trialEndsAt,
              current_period_ends_at: currentPeriodEndsAt,
              payment_method: paymentMethod
            });
        }
        
        logStep("Updated subscription record", { planId });
      } catch (error: any) {
        logStep("Failed to update subscription", { error: error.message });
      }
    }
    
    // Return success response to CardCom
    return new Response("OK", { 
      status: 200, 
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      errorMessage || "Webhook processing failed",
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        },
      }
    );
  }
});
