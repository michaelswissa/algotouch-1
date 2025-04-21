
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let lowProfileCode, sessionId, terminalNumber, timestamp, attempt, operationType, planType, forceRefresh;

    try {
      const payload = await req.json();
      lowProfileCode = payload.lowProfileCode;
      sessionId = payload.sessionId;
      terminalNumber = payload.terminalNumber || Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
      timestamp = payload.timestamp || Date.now();
      attempt = payload.attempt || 0;
      operationType = payload.operationType || 'payment'; // Can be 'payment' or 'token_only'
      planType = payload.planType || null;
      forceRefresh = payload.forceRefresh || false;

      logStep("Request payload parsed", { 
        lowProfileCode, 
        sessionId, 
        terminalNumber, 
        timestamp,
        attempt,
        operationType,
        planType,
        forceRefresh
      });
    } catch (parseError) {
      logStep("Error parsing request body", { error: parseError.message });
      throw new Error("Invalid request format");
    }

    if (!lowProfileCode) {
      throw new Error("Missing required parameter: lowProfileCode");
    }

    if (sessionId && !sessionId.startsWith('temp-')) {
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .select('status, transaction_id, plan_id')
        .eq('id', sessionId)
        .eq('low_profile_code', lowProfileCode)
        .maybeSingle();
        
      if (!sessionError && sessionData) {
        logStep("Found session in database", { 
          status: sessionData.status, 
          hasTransactionId: !!sessionData.transaction_id,
          planId: sessionData.plan_id
        });
        
        if (sessionData.status === 'completed' && sessionData.transaction_id) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'התשלום כבר בוצע בהצלחה',
              data: {
                transactionId: sessionData.transaction_id,
                lowProfileCode,
                isTokenOperation: operationType === 'token_only' || planType === 'monthly',
                token: sessionData.transaction_id
              }
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        if (sessionData.status === 'failed') {
          return new Response(
            JSON.stringify({
              success: false,
              failed: true,
              message: 'התשלום נכשל',
              data: {
                lowProfileCode,
                status: 'failed',
                isTokenOperation: operationType === 'token_only' || planType === 'monthly'
              }
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // If we have plan information, add it to the operation type detection
        if (sessionData.plan_id === 'monthly') {
          operationType = 'token_only';
          planType = 'monthly';
        }
      }
    }

    logStep("Checking payment status", { 
      lowProfileCode, 
      sessionId, 
      attempt, 
      operationType,
      planType
    });

    const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";

    logStep("Using CardCom credentials", { 
      terminalNumber, 
      apiNameLength: apiName?.length || 0,
      operationType
    });

    // According to CardCom docs, we should call BillGoldGetLowProfileIndicator with POST
    const cardcomPayload = new URLSearchParams({
      terminalnumber: terminalNumber,
      username: apiName,
      lowprofilecode: lowProfileCode,
      timestamp: timestamp.toString(),
      _nocache: Math.random().toString()
    }).toString();

    logStep("Sending request to CardCom API", { 
      url: "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx",
      timestamp,
      payloadLength: cardcomPayload.length,
      attempt,
      operationType,
      forceRefresh
    });

    const cardcomResponse = await fetch(
      "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx", 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: cardcomPayload,
      }
    );

    if (!cardcomResponse.ok) {
      logStep("CardCom API error response", { 
        status: cardcomResponse.status, 
        statusText: cardcomResponse.statusText 
      });
      throw new Error(`CardCom API error: ${cardcomResponse.status} ${cardcomResponse.statusText}`);
    }

    const responseText = await cardcomResponse.text();
    logStep("Raw CardCom response", { responseText, attempt, operationType });

    const responseParams = new URLSearchParams(responseText);

    // Extract all relevant fields from the response
    const operationResponse = responseParams.get('OperationResponse');
    const dealResponse = responseParams.get('DealResponse');
    const transactionId = responseParams.get('InternalDealNumber');
    const returnValue = responseParams.get('ReturnValue');
    const description = responseParams.get('Description');
    const operation = responseParams.get('Operation');
    const token = responseParams.get('Token');
    const tokenResponse = responseParams.get('TokenResponse');
    const tokenExDate = responseParams.get('TokenExDate');
    const cardOwnerEmail = responseParams.get('CardOwnerEmail');
    const cardOwnerPhone = responseParams.get('CardOwnerPhone');
    const cardOwnerName = responseParams.get('CardOwnerName');
    const threeDSResult = responseParams.get('ThreeDSResult');
    const cardMonth = responseParams.get('CardValidityMonth') || responseParams.get('CardMonth');
    const cardYear = responseParams.get('CardValidityYear') || responseParams.get('CardYear');
    const accountId = responseParams.get('AccountId');
    const last4Digits = responseParams.get('CardNumber5') || responseParams.get('ExtShvaParams.CardNumEnd') || '****';
    const prossesEndOk = responseParams.get('ProssesEndOk'); // Important for TokenOnly operations

    logStep("CardCom status response details", { 
      operationResponse, 
      dealResponse, 
      transactionId, 
      returnValue, 
      description, 
      operation, 
      threeDSResult, 
      token, 
      tokenResponse, 
      tokenExDate, 
      prossesEndOk,
      attempt,
      operationType,
      last4Digits
    });

    // Improved token creation detection logic based on CardCom documentation
    const isMonthlySubscription = planType === 'monthly';
    const isTokenCreationOp = 
      operationType === 'token_only' || // Explicitly requested token operation
      isMonthlySubscription ||         // Monthly plans create tokens
      operation === '2' ||             // Operation 2 = ChargeAndCreateToken
      operation === '3';               // Operation 3 = CreateTokenOnly

    // Better token success detection with multiple criteria from CardCom docs
    // ProssesEndOk is important for token operations to confirm the entire process completed
    const tokenCreatedSuccessfully = isTokenCreationOp && (
      // Token exists and ProssesEndOk (entire process completed)
      ((!!token && token.length > 10) && (prossesEndOk === "True" || prossesEndOk === "true")) ||
      // Specific token success response code
      (tokenResponse === '0' && (!!token && token.length > 10)) ||
      // General success with valid token
      ((operationResponse === '0' || operationResponse === 0) && (!!token && token.length > 10))
    );

    logStep("Token detection analysis", {
      isTokenCreationOp,
      tokenCreatedSuccessfully,
      isMonthlySubscription,
      hasValidToken: !!token && token.length > 10,
      tokenResponseIs0: tokenResponse === '0',
      prossesEndOk,
      operation
    });

    // Check for timeout specifically for token operations
    // If we've tried many times and still no token, likely a timeout
    const isTokenTimeout = isTokenCreationOp && attempt >= 15 && !token;
    
    if (isTokenTimeout) {
      logStep("Token creation timeout detected", { attempt });
      
      // Update the database if we have a session
      if (sessionId && !sessionId.startsWith('temp-')) {
        try {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'failed',
              transaction_data: Object.fromEntries(responseParams.entries()),
              updated_at: new Date().toISOString(),
              error_message: 'Token creation timeout'
            })
            .eq('id', sessionId);
        } catch (dbError) {
          logStep("DB error on token timeout", { error: dbError });
        }
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          failed: true,
          timeout: true,
          message: 'חריגת זמן ביצירת אסימון',
          data: {
            lowProfileCode,
            isTokenOperation: true,
            attempt
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle successful token creation
    if (tokenCreatedSuccessfully) {
      logStep("Token creation successful", { token, tokenExDate });
      
      // If we have a valid session, update it
      if (sessionId && !sessionId.startsWith('temp-')) {
        try {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: token,
              transaction_data: Object.fromEntries(responseParams.entries()),
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
          
          // If this is a monthly subscription, create a recurring_payments record
          if (isMonthlySubscription && token) {
            try {
              const { data: userIdData } = await supabaseAdmin
                .from('payment_sessions')
                .select('user_id')
                .eq('id', sessionId)
                .single();
                
              if (userIdData?.user_id) {
                // Insert/update recurring payment record
                await supabaseAdmin
                  .from('recurring_payments')
                  .upsert({
                    user_id: userIdData.user_id,
                    token: token,
                    token_expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split('T')[0], // 3 years from now
                    status: 'active',
                    last_4_digits: last4Digits,
                    updated_at: new Date().toISOString()
                  }, {
                    onConflict: 'user_id'
                  });
                
                logStep("Created recurring payment record", { 
                  userId: userIdData.user_id,
                  token
                });
              }
            } catch (recurringError) {
              logStep("Error creating recurring payment", { error: recurringError });
            }
          }
          
          logStep("Database updated for token creation", { sessionId });
        } catch (dbError: any) {
          logStep("DB error on token creation", { message: dbError.message });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'אישור התשלום התקבל (נוצר אסימון)',
        data: {
          token, 
          tokenExDate, 
          lowProfileCode, 
          tokenResponse, 
          cardOwnerEmail, 
          cardOwnerPhone, 
          cardOwnerName,
          isTokenOperation: true
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle token creation failure
    if (isTokenCreationOp && tokenResponse && tokenResponse !== '0') {
      logStep("Token creation failed", { tokenResponse, description });
      
      // Update the session as failed
      if (sessionId && !sessionId.startsWith('temp-')) {
        try {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'failed',
              transaction_data: Object.fromEntries(responseParams.entries()),
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
        } catch (dbError) {
          logStep("Error updating session on token failure", { error: dbError });
        }
      }
      
      return new Response(JSON.stringify({
        failed: true,
        success: false,
        message: description || 'יצירת האסימון נכשלה',
        data: {
          token, 
          tokenExDate, 
          tokenResponse, 
          lowProfileCode,
          isTokenOperation: true
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Processing state detection with improved handling for token creation
    const is3DSProcess = operation === '5' || threeDSResult === 'Processing';
    const is3DSComplete = threeDSResult === 'Complete';
    
    // More flexible processing detection based on operation type and attempt count
    const isStillProcessing = 
      !operationResponse || 
      is3DSProcess || 
      (isTokenCreationOp && !tokenCreatedSuccessfully && attempt < 15);
      
    if (isStillProcessing) {
      logStep("Transaction still processing", {
        operationResponse,
        is3DSProcess,
        attempt
      });
      
      // Return processing status for client to continue polling
      return new Response(JSON.stringify({
        success: false,
        failed: false,
        processing: true,
        message: 'העסקה עדיין מעובדת',
        data: {
          lowProfileCode,
          attempt
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Check for a successful payment without token
    const isPaymentSuccess = 
      !isTokenCreationOp && 
      operationResponse === "0" && 
      transactionId && 
      dealResponse === "0";
    
    if (isPaymentSuccess) {
      logStep("Payment transaction successful", { transactionId });
      
      // If we have a valid session, update it
      if (sessionId && !sessionId.startsWith('temp-')) {
        try {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: transactionId,
              transaction_data: Object.fromEntries(responseParams.entries()),
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
            
          logStep("Database updated for successful payment", { sessionId });
        } catch (dbError) {
          logStep("DB error updating payment success", { error: dbError });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'התשלום התקבל בהצלחה',
        data: {
          transactionId,
          lowProfileCode
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Check for payment failure
    const isPaymentFailure = 
      !isTokenCreationOp && 
      (operationResponse !== "0" || dealResponse !== "0");

    if (isPaymentFailure) {
      logStep("Payment transaction failed", { 
        operationResponse, 
        dealResponse, 
        description 
      });
      
      // If we have a valid session, update it
      if (sessionId && !sessionId.startsWith('temp-')) {
        try {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'failed',
              transaction_data: Object.fromEntries(responseParams.entries()),
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
            
          logStep("Database updated for failed payment", { sessionId });
        } catch (dbError) {
          logStep("DB error updating payment failure", { error: dbError });
        }
      }
      
      return new Response(JSON.stringify({
        success: false,
        failed: true,
        message: description || 'התשלום נכשל',
        data: {
          lowProfileCode
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Default case: still waiting for definitive response
    logStep("No definitive status yet", { 
      operationResponse, 
      dealResponse, 
      description,
      attempt
    });
    
    return new Response(JSON.stringify({
      success: false,
      processing: true,
      message: 'ממתין לסיום עיבוד העסקה',
      data: {
        lowProfileCode,
        attempt
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Payment status check failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
