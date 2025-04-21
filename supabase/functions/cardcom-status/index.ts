
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
  console.log(`[CARDCOM-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase admin client for database operations that bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Parse request payload
    let lowProfileCode, sessionId, terminalNumber, timestamp, attempt;
    
    try {
      const payload = await req.json();
      lowProfileCode = payload.lowProfileCode;
      sessionId = payload.sessionId;
      terminalNumber = payload.terminalNumber || Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
      timestamp = payload.timestamp || Date.now(); // Use provided timestamp or generate new one
      attempt = payload.attempt || 0; // Track attempt number for better logging
      
      logStep("Request payload parsed", { 
        lowProfileCode, 
        sessionId, 
        terminalNumber, 
        timestamp,
        attempt 
      });
    } catch (parseError) {
      logStep("Error parsing request body", { error: parseError.message });
      throw new Error("Invalid request format");
    }
    
    if (!lowProfileCode) {
      throw new Error("Missing required parameter: lowProfileCode");
    }
    
    // First, check if session is already marked as completed in our database
    if (sessionId && !sessionId.startsWith('temp-')) {
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .select('status, transaction_id')
        .eq('id', sessionId)
        .eq('low_profile_code', lowProfileCode)
        .maybeSingle();
        
      if (!sessionError && sessionData) {
        logStep("Found session in database", { 
          status: sessionData.status, 
          hasTransactionId: !!sessionData.transaction_id 
        });
        
        // If session is already completed, return success immediately
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
        
        // If session is already failed, return failure immediately
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
      }
    }
    
    logStep("Checking payment status", { lowProfileCode, sessionId, attempt });
    
    // Call CardCom API to get payment status
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
    
    logStep("Using CardCom credentials", { 
      terminalNumber, 
      apiNameLength: apiName?.length || 0 
    });
    
    // Build request with cache-busting measures
    const cardcomPayload = new URLSearchParams({
      terminalnumber: terminalNumber,
      username: apiName,
      lowprofilecode: lowProfileCode,
      timestamp: timestamp.toString(), // Add timestamp to prevent caching
      _nocache: Math.random().toString() // Add random value to prevent caching
    }).toString();
    
    logStep("Sending request to CardCom API", { 
      url: "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx",
      timestamp,
      payloadLength: cardcomPayload.length,
      attempt
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
    
    // Parse CardCom response
    const responseText = await cardcomResponse.text();
    logStep("Raw CardCom response", { responseText, attempt });
    
    const responseParams = new URLSearchParams(responseText);
    
    // Extract key information
    const operationResponse = responseParams.get('OperationResponse');
    const dealResponse = responseParams.get('DealResponse');
    const transactionId = responseParams.get('InternalDealNumber');
    const returnValue = responseParams.get('ReturnValue');
    const description = responseParams.get('Description');
    const operation = responseParams.get('Operation');
    
    // Additional fields for better debugging
    const cardOwnerEmail = responseParams.get('CardOwnerEmail');
    const cardOwnerPhone = responseParams.get('CardOwnerPhone');
    const cardOwnerName = responseParams.get('CardOwnerName');
    const threeDSResult = responseParams.get('ThreeDSResult');
    const cardMonth = responseParams.get('CardValidityMonth') || responseParams.get('CardMonth');
    const cardYear = responseParams.get('CardValidityYear') || responseParams.get('CardYear');
    
    logStep("CardCom status response details", { 
      operationResponse, 
      dealResponse,
      transactionId,
      returnValue,
      description,
      operation,
      threeDSResult,
      hasCardOwnerEmail: !!cardOwnerEmail,
      hasCardOwnerPhone: !!cardOwnerPhone,
      hasCardOwnerName: !!cardOwnerName,
      cardMonth,
      cardYear,
      attempt
    });
    
    // Check if we need to wait for further processing (e.g., 3DS)
    const is3DSProcess = operation === '5' || threeDSResult === 'Processing';
    const is3DSComplete = threeDSResult === 'Complete';
    const isInitialProcessing = !operationResponse && attempt < 3;
    
    // Return early if transaction is still processing
    if (isInitialProcessing || is3DSProcess) {
      return new Response(
        JSON.stringify({
          success: false,
          processing: true,
          message: 'העסקה עדיין בעיבוד...',
          data: {
            operationResponse,
            dealResponse,
            description,
            is3DSProcess,
            operation,
            threeDSResult,
            attempt,
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

    // Determine payment success based on CardCom response
    const isSuccessful = operationResponse === '0';
    
    // Update session status in database if available
    if (isSuccessful && sessionId) {
      try {
        // Only update real DB sessions (not temp ones)
        if (!sessionId.startsWith('temp-')) {
          const updateResult = await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: transactionId,
              transaction_data: Object.fromEntries(responseParams.entries()),
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
          
          logStep("Database update result", { 
            status: updateResult.status, 
            error: updateResult.error?.message || null 
          });
        } else {
          logStep("Skipping DB update for temporary session", { sessionId });
        }
      } catch (dbError: any) {
        logStep("Database error (non-fatal)", { error: dbError.message });
        // Continue even if DB update fails - webhook will handle this
      }
    }
    
    // Return payment status information with clear message for the user
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
        status: 200, // Return 200 even for errors to prevent retry loops
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
