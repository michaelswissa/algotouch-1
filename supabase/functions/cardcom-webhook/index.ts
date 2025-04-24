import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[${timestamp}] [CARDCOM-WEBHOOK] ${step}${detailsStr}`);
};

const isSuccessCode = (code: any): boolean => {
  const numCode = typeof code === 'string' ? parseInt(code) : code;
  const isSuccess = numCode === 0 || numCode === 700 || numCode === 701;
  logStep("Checking success code", { code, isSuccess });
  return isSuccess;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { 
      method: req.method, 
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let webhookData;

    const contentType = req.headers.get('content-type') || '';
    logStep("Content-Type", { contentType });

    if (contentType.includes('application/json')) {
      webhookData = await req.json();
      logStep("Parsed JSON webhook data", webhookData);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await req.formData();
        webhookData = Object.fromEntries(formData.entries());
        logStep("Parsed form data webhook", webhookData);
      } catch (formError) {
        const text = await req.text();
        logStep("FormData parsing failed, trying text parsing", { text });
        
        try {
          const params = new URLSearchParams(text);
          webhookData = Object.fromEntries(params.entries());
          logStep("Manually parsed form data", webhookData);
        } catch (textParseError) {
          throw new Error(`Failed to parse form data: ${textParseError.message}, Raw content: ${text}`);
        }
      }
    } else {
      const text = await req.text();
      logStep("Unexpected content type, raw content", { text });
      
      try {
        const params = new URLSearchParams(text);
        webhookData = Object.fromEntries(params.entries());
        logStep("Parsed as URL-encoded despite content type");
      } catch (e) {
        try {
          webhookData = JSON.parse(text);
          logStep("Parsed as JSON despite content type");
        } catch (jsonError) {
          throw new Error(`Unsupported content type: ${contentType}, Raw content: ${text}`);
        }
      }
    }

    logStep("Processing webhook data", webhookData);

    const {
      LowProfileId: lowProfileCode,
      ReturnValue: returnValue,
      InternalDealNumber: transactionId,
      TranzactionInfo: transactionInfo,
      TokenInfo: tokenInfo,
      CardNumber5: cardNumber5,
    } = webhookData;

    const mainResponseCode = webhookData.ResponseCode;
    const operationResponseCode = webhookData.OperationResponse;
    const transactionResponseCode = transactionInfo?.ResponseCode;
    
    logStep("Response codes detected", { 
      mainResponseCode,
      operationResponseCode,
      transactionResponseCode
    });
    
    const isSuccessful = 
      isSuccessCode(mainResponseCode) || 
      isSuccessCode(operationResponseCode) ||
      isSuccessCode(transactionResponseCode);

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

    if (!lowProfileCode) {
      logStep("Missing LowProfileId", webhookData);
      return new Response("OK - Missing LowProfileId, but accepting request", {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .maybeSingle();

    if (sessionError) {
      logStep("Payment session DB error", sessionError);
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
          
          const sessionDataFound = sessionByReturnValue;
          
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
          return new Response("OK - Session not found", {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/plain'
            }
          });
        }
      } else {
        return new Response("OK - Session not found and no ReturnValue", {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
    }

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
    logStep("ERROR", { message: errorMessage, stack: error.stack });

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
    paymentMethod = {
      token: transactionInfo.Token || null,
      lastFourDigits: transactionInfo.Last4CardDigitsString || cardNumber5 || "0000",
      expiryMonth: transactionInfo.CardMonth || null,
      expiryYear: transactionInfo.CardYear || null
    };
  }

  const status = isSuccessful && !hasFailedTransaction ? 'completed' : 'failed';
  
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

  const { error: updateError } = await supabaseAdmin
    .from('payment_sessions')
    .update(updateData)
    .eq('id', sessionData.id);

  if (updateError) {
    logStep("Failed to update payment session", updateError);
    return new Response("OK - Failed to update session", {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  }

  logStep("Updated payment session status", { status, sessionId: sessionData.id });

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
  }

  if (status === 'completed') {
    try {
      const now = new Date();
      const planId = sessionData.plan_id;
      let trialEndsAt = null;
      let nextChargeDate = null;
      let currentPeriodEndsAt = null;
      let subscriptionStatus = 'active';

      if (planId === 'monthly') {
        if (sessionData.amount === 0) {
          subscriptionStatus = 'trial';
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 7);
          nextChargeDate = new Date(trialEndsAt);
          currentPeriodEndsAt = new Date(nextChargeDate);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
        } else {
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
          nextChargeDate = new Date(currentPeriodEndsAt);
        }
      } else if (planId === 'annual') {
        if (sessionData.amount === 0) {
          subscriptionStatus = 'trial';
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 14);
          nextChargeDate = new Date(trialEndsAt);
          currentPeriodEndsAt = new Date(nextChargeDate);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
        } else {
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
          nextChargeDate = new Date(currentPeriodEndsAt);
        }
      } else if (planId === 'vip') {
        currentPeriodEndsAt = null;
        nextChargeDate = null;
      }

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
    } catch (error: any) {
      logStep("Failed to update subscription", { error: error.message });
    }
  }

  logStep("Webhook processing completed successfully");
  return new Response("OK", {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain'
    }
  });
}
