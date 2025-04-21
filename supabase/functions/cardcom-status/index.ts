
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

    let lowProfileCode, sessionId, terminalNumber, timestamp, attempt, operationType, planType;

    try {
      const payload = await req.json();
      lowProfileCode = payload.lowProfileCode;
      sessionId = payload.sessionId;
      terminalNumber = payload.terminalNumber || Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
      timestamp = payload.timestamp || Date.now();
      attempt = payload.attempt || 0;
      operationType = payload.operationType || 'payment'; // Can be 'payment' or 'token_only'
      planType = payload.planType || null;

      logStep("Request payload parsed", { 
        lowProfileCode, 
        sessionId, 
        terminalNumber, 
        timestamp,
        attempt,
        operationType,
        planType
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
                lowProfileCode
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
                status: 'failed'
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
      operationType
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
    const last4Digits = responseParams.get('CardNumber5') || '****';

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
    const tokenCreatedSuccessfully = isTokenCreationOp && (
      (!!token && token.length > 10) || // Valid token format
      tokenResponse === '0' ||          // Successful token response
      (!!operationResponse && (operationResponse === '0' || operationResponse === 0)) // General success
    );

    logStep("Token detection analysis", {
      isTokenCreationOp,
      tokenCreatedSuccessfully,
      isMonthlySubscription,
      hasValidToken: !!token && token.length > 10,
      tokenResponseIs0: tokenResponse === '0',
      operation
    });

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

    // Processing state detection with improved handling
    const is3DSProcess = operation === '5' || threeDSResult === 'Processing';
    const is3DSComplete = threeDSResult === 'Complete';
    
    // More flexible processing detection based on operation type
    const isStillProcessing = 
      !operationResponse || 
      is3DSProcess || 
      (attempt < 3 && isTokenCreationOp && !token) || // Early in token creation
      (attempt < 5 && !isTokenCreationOp); // Regular payment processing
    
    if (isStillProcessing) {
      logStep("Transaction still processing", {
        operationType,
        isTokenCreationOp,
        is3DSProcess,
        attempt
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          processing: true,
          message: isTokenCreationOp 
            ? 'יצירת אסימון לחיוב חודשי בעיבוד...' 
            : 'העסקה עדיין בעיבוד...',
          data: { 
            operationResponse, 
            dealResponse, 
            description, 
            is3DSProcess, 
            operation, 
            threeDSResult, 
            attempt,
            isTokenOperation: isTokenCreationOp,
            cardcomResponse: { 
              status: cardcomResponse.status, 
              ok: cardcomResponse.ok 
            }
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Standard payment success handling (not token creation)
    const isSuccessful = operationResponse === '0';

    if (isSuccessful && sessionId) {
      try {
        if (!sessionId.startsWith('temp-')) {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: transactionId,
              transaction_data: Object.fromEntries(responseParams.entries()),
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
          logStep("Database update result", { sessionId });
        }
      } catch (dbError: any) {
        logStep("Database error (non-fatal)", { error: dbError.message });
      }
    } else if (!isSuccessful && sessionId && !sessionId.startsWith('temp-')) {
      // Update failed transaction
      try {
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: 'failed',
            transaction_data: Object.fromEntries(responseParams.entries()),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
        logStep("Updated session to failed status", { sessionId });
      } catch (dbError) {
        logStep("Error updating session failure", { error: dbError });
      }
    }

    const userFriendlyMessage = isSuccessful 
      ? 'התשלום בוצע בהצלחה!'
      : description || 'אירעה שגיאה בביצוע התשלום';

    return new Response(
      JSON.stringify({
        success: isSuccessful,
        failed: !isSuccessful,
        message: userFriendlyMessage,
        data: {
          operationResponse,
          dealResponse,
          transactionId,
          returnValue,
          threeDSResult,
          is3DSComplete,
          attempt,
          isTokenOperation: false,
          cardcomResponse: {
            status: cardcomResponse.status,
            ok: cardcomResponse.ok
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "בדיקת סטטוס התשלום נכשלה",
        error: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
