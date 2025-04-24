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

// Helper function to check if a response code indicates success
const isSuccessCode = (code: any): boolean => {
  // Convert to number if it's a string
  const numCode = typeof code === 'string' ? parseInt(code) : code;
  // Success codes include 0 (standard success), 700 and 701 (J2 and J5 transaction success)
  return numCode === 0 || numCode === 700 || numCode === 701;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method, url: req.url });

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook data - CardCom sends data in request body
    let webhookData;

    const contentType = req.headers.get('content-type') || '';
    logStep("Content-Type", { contentType });

    if (contentType.includes('application/json')) {
      webhookData = await req.json();
      logStep("Parsed JSON webhook data");
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await req.formData();
        webhookData = Object.fromEntries(formData.entries());
        logStep("Parsed form data webhook");
      } catch (formError) {
        // Handle raw form data if formData() fails
        const text = await req.text();
        logStep("FormData parsing failed, trying text parsing", { text });
        
        try {
          // Try to parse URL-encoded form data manually
          const params = new URLSearchParams(text);
          webhookData = Object.fromEntries(params.entries());
          logStep("Manually parsed form data");
        } catch (textParseError) {
          throw new Error(`Failed to parse form data: ${textParseError.message}, Raw content: ${text}`);
        }
      }
    } else {
      // Try to handle any other format as text
      const text = await req.text();
      logStep("Unexpected content type, raw content", { text });
      
      try {
        // Try to parse as URL-encoded
        const params = new URLSearchParams(text);
        webhookData = Object.fromEntries(params.entries());
        logStep("Parsed as URL-encoded despite content type");
      } catch (e) {
        try {
          // Try to parse as JSON
          webhookData = JSON.parse(text);
          logStep("Parsed as JSON despite content type");
        } catch (jsonError) {
          throw new Error(`Unsupported content type: ${contentType}, Raw content: ${text}`);
        }
      }
    }

    logStep("Received webhook data", webhookData);

    // Extract required fields from webhook data
    const {
      LowProfileId: lowProfileCode,
      ReturnValue: returnValue,
      InternalDealNumber: transactionId,
      TranzactionInfo: transactionInfo,
      TokenInfo: tokenInfo,
      CardNumber5: cardNumber5,
    } = webhookData;

    // Check all possible response code fields - this is the key improvement
    // Get all possible places where response codes could be stored
    const mainResponseCode = webhookData.ResponseCode;
    const operationResponseCode = webhookData.OperationResponse;
    const transactionResponseCode = transactionInfo?.ResponseCode;
    
    logStep("Response codes detected", { 
      mainResponseCode,
      operationResponseCode,
      transactionResponseCode
    });
    
    // Check if ANY of the response codes indicate success
    const isSuccessful = 
      isSuccessCode(mainResponseCode) || 
      isSuccessCode(operationResponseCode) ||
      isSuccessCode(transactionResponseCode);

    // Special case: If transaction info exists with a response code, prioritize that
    const hasTransactionInfo = !!transactionInfo;
    const hasFailedTransaction = hasTransactionInfo && !isSuccessCode(transactionResponseCode);

    logStep("Payment success check", { 
      isSuccessful,
      hasTransactionInfo,
      hasFailedTransaction,
      mainResponseCode,
      operationResponseCode,
      transactionResponseCode
    });

    // Basic data validation
    if (!lowProfileCode) {
      logStep("Missing LowProfileId", webhookData);
      // Don't fail - return 200 so CardCom doesn't retry
      return new Response("OK - Missing LowProfileId, but accepting request", {
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
      .maybeSingle();

    if (sessionError) {
      logStep("Payment session DB error", sessionError);
      // Don't fail - allow webhook to be idempotent and return 200
      return new Response("OK - Session not found (DB error)", {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }
    
    if (!sessionData) {
      logStep("Payment session missing for LowProfileId", { lowProfileCode });
      
      // Try to check by ReturnValue as fallback
      if (returnValue) {
        const { data: sessionByReturnValue } = await supabaseAdmin
          .from('payment_sessions')
          .select('*')
          .eq('reference', returnValue)
          .maybeSingle();
          
        if (sessionByReturnValue) {
          logStep("Found payment session by ReturnValue", { 
            sessionId: sessionByReturnValue.id,
            reference: returnValue
          });
          
          // Continue with this session data
          const sessionDataFound = sessionByReturnValue;
          
          // Process with the found session
          return await processPaymentSession(
            supabaseAdmin,
            sessionDataFound,
            webhookData,
            transactionId,
            transactionInfo,
            tokenInfo,
            cardNumber5,
            isSuccessful,
            hasFailedTransaction,
            corsHeaders
          );
          
        } else {
          // Don't fail
          return new Response("OK - Session not found", {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/plain'
            }
          });
        }
      } else {
        // Don't fail
        return new Response("OK - Session not found and no ReturnValue", {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
    }

    // Process the payment session with all the extracted data
    return await processPaymentSession(
      supabaseAdmin,
      sessionData,
      webhookData,
      transactionId,
      transactionInfo,
      tokenInfo,
      cardNumber5,
      isSuccessful,
      hasFailedTransaction,
      corsHeaders
    );
    
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Still return OK (idempotent) to let CardCom not retry forever
    return new Response(
      errorMessage || "Webhook processing failed",
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        },
      }
    );
  }
});

// Helper function to process payment session data
async function processPaymentSession(
  supabaseAdmin: any,
  sessionData: any,
  webhookData: any,
  transactionId: any,
  transactionInfo: any,
  tokenInfo: any,
  cardNumber5: any,
  isSuccessful: boolean,
  hasFailedTransaction: boolean,
  corsHeaders: any
) {
  logStep("Processing payment session", {
    sessionId: sessionData.id,
    userId: sessionData.user_id,
    planId: sessionData.plan_id,
    currentStatus: sessionData.status,
    isSuccessful,
    hasFailedTransaction
  });

  // Check if this session is already processed (idempotency)
  if (sessionData.status === 'completed' && sessionData.transaction_id) {
    logStep("Session already completed", { 
      transactionId: sessionData.transaction_id,
      sessionId: sessionData.id 
    });
    return new Response("OK - Session already processed", {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  }

  // Extract token information if available
  let paymentMethod = null;
  if (tokenInfo) {
    paymentMethod = {
      token: tokenInfo.Token,
      tokenExpiryDate: tokenInfo.TokenExDate,
      lastFourDigits: cardNumber5 || webhookData.Last4CardDigits || "0000",
      expiryMonth: tokenInfo.CardMonth || tokenInfo.CardValidityMonth,
      expiryYear: tokenInfo.CardYear || tokenInfo.CardValidityYear
    };
  } else if (transactionInfo) {
    // Try to extract from transaction info if available
    paymentMethod = {
      token: transactionInfo.Token || null,
      lastFourDigits: transactionInfo.Last4CardDigitsString || cardNumber5 || "0000",
      expiryMonth: transactionInfo.CardMonth || null,
      expiryYear: transactionInfo.CardYear || null
    };
  }

  // Determine payment status - this is crucial for fixing the success detection
  const status = isSuccessful && !hasFailedTransaction ? 'completed' : 'failed';
  
  // Get actual transaction ID from various possible fields
  const finalTransactionId = 
    transactionId || 
    (transactionInfo && transactionInfo.TranzactionId) || 
    webhookData.TransactionId || 
    webhookData.TranzactionId || 
    (tokenInfo && tokenInfo.Token) || 
    null;

  logStep("Determined payment status", { 
    isSuccessful, 
    hasFailedTransaction,
    status, 
    finalTransactionId,
    hasPaymentMethod: !!paymentMethod
  });

  const updateData: any = {
    status,
    transaction_id: finalTransactionId,
    transaction_data: webhookData,
    updated_at: new Date().toISOString()
  };

  if (paymentMethod) {
    updateData.payment_method = paymentMethod;
  }

  // Always update payment session, even if called multiple times!
  const { error: updateError } = await supabaseAdmin
    .from('payment_sessions')
    .update(updateData)
    .eq('id', sessionData.id);

  if (updateError) {
    logStep("Failed to update payment session", updateError);
    // Return OK anyway for idempotency
    return new Response("OK - Failed to update session", {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  }

  logStep("Updated payment session status", { status, sessionId: sessionData.id });

  // Log transaction in either 'payment_logs' or 'payment_errors'
  const logTable = status === 'completed' ? 'payment_logs' : 'payment_errors';

  const logData = status === 'completed'
    ? {
      user_id: sessionData.user_id,
      transaction_id: finalTransactionId,
      amount: sessionData.amount,
      currency: sessionData.currency,
      plan_id: sessionData.plan_id,
      payment_status: 'succeeded',
      payment_data: webhookData
    }
    : {
      user_id: sessionData.user_id,
      error_code: webhookData.ResponseCode || webhookData.OperationResponse || (transactionInfo?.ResponseCode?.toString()),
      error_message: transactionInfo?.Description || webhookData.Description || 'Payment failed',
      request_data: { low_profile_code: webhookData.LowProfileId, return_value: webhookData.ReturnValue },
      response_data: webhookData
    };

  const { error: logError } = await supabaseAdmin
    .from(logTable)
    .insert(logData);

  if (logError) {
    logStep("Error logging transaction", { error: logError.message });
    // Continue anyway
  }

  // If payment successful, update subscription record
  if (status === 'completed') {
    try {
      // Calculate trial/subscription periods
      const now = new Date();
      const planId = sessionData.plan_id;
      let trialEndsAt = null;
      let nextChargeDate = null;
      let currentPeriodEndsAt = null;
      let subscriptionStatus = 'active';

      if (planId === 'monthly') {
        if (sessionData.amount === 0) {
          // This is a trial
          subscriptionStatus = 'trial';
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial
          nextChargeDate = new Date(trialEndsAt);
          currentPeriodEndsAt = new Date(nextChargeDate);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
        } else {
          // Regular monthly payment
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
          nextChargeDate = new Date(currentPeriodEndsAt);
        }
      } else if (planId === 'annual') {
        if (sessionData.amount === 0) {
          // This is a trial
          subscriptionStatus = 'trial';
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
          nextChargeDate = new Date(trialEndsAt);
          currentPeriodEndsAt = new Date(nextChargeDate);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
        } else {
          // Regular annual payment
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
          nextChargeDate = new Date(currentPeriodEndsAt);
        }
      } else if (planId === 'vip') {
        // VIP plan has no expiry
        currentPeriodEndsAt = null;
        nextChargeDate = null;
      }

      // Create or update subscription record
      const { data: existingSubscription } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', sessionData.user_id)
        .maybeSingle();

      if (existingSubscription) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            plan_type: planId,
            status: planId === 'vip' ? 'active' : subscriptionStatus,
            next_charge_date: nextChargeDate,
            trial_ends_at: trialEndsAt,
            current_period_ends_at: currentPeriodEndsAt,
            payment_method: paymentMethod,
            updated_at: now.toISOString()
          })
          .eq('id', existingSubscription.id);
      } else {
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: sessionData.user_id,
            plan_type: planId,
            status: planId === 'vip' ? 'active' : subscriptionStatus,
            next_charge_date: nextChargeDate,
            trial_ends_at: trialEndsAt,
            current_period_ends_at: currentPeriodEndsAt,
            payment_method: paymentMethod
          });
      }
      logStep("Updated subscription record", { planId, userId: sessionData.user_id });
    } catch (error: any) {
      logStep("Failed to update subscription", { error: error.message });
    }
  }

  // Always return OK (idempotent), to let CardCom know it received the callback!
  return new Response("OK", {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain'
    }
  });
}
