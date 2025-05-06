
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";

// Helper function to log steps and data
function logStep(functionName: string, step: string, data: any = {}) {
  console.log(`[${functionName}][${step}]`, JSON.stringify(data));
}

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("CARDCOM-IFRAME", "Function started");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get CardCom configuration
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");

    if (!terminalNumber || !apiName) {
      throw new Error("Missing CardCom API configuration");
    }

    // Log the environment variables (sanitized)
    logStep("CARDCOM-IFRAME", "Credentials check", {
      hasTerminalNumber: Boolean(terminalNumber),
      hasApiName: Boolean(apiName),
      terminalNumberPartial: terminalNumber ? terminalNumber.substring(0, 2) + "..." : "missing",
    });

    const requestData = await req.json();
    logStep("CARDCOM-IFRAME", "Request data received", requestData);

    // Validate required parameters
    const { 
      planId, 
      userId, 
      email, 
      fullName, 
      phone,
      idNumber,
      enableJValidateOptionalFields = false // New parameter for error 103 retry
    } = requestData;

    // Convert operation type to numeric value as required by CardCom
    // 1 = ChargeOnly, 2 = ChargeAndCreateToken, 3 = CreateTokenOnly
    let operation = 1; // Default: ChargeOnly (1)
    
    if (requestData.operationType === "CreateTokenOnly" || requestData.operationType === "token_only" || planId === 'monthly') {
      operation = 3; // CreateTokenOnly (3)
    } else if (requestData.operationType === "ChargeAndCreateToken") {
      operation = 2; // ChargeAndCreateToken (2)
    }

    logStep("CARDCOM-IFRAME", "Operation determined", { 
      operation,
      operationTypeRequested: requestData.operationType,
      planId,
      enableJValidateOptionalFields
    });

    if (!planId) {
      throw new Error("Missing required parameter: planId");
    }

    if (!email || !fullName) {
      throw new Error("Missing required parameters: email and fullName are required");
    }

    if (!phone || !idNumber) {
      throw new Error("Missing required parameters: phone and idNumber are required");
    }

    // Generate transaction reference
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Get plan details from database
    let amount = 0;
    let productName = "מנוי שירות";

    // Map plan ID to appropriate operation and amount
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (planError) {
      throw new Error(`Error fetching plan details: ${planError.message}`);
    }
    
    if (!plan) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    productName = plan.name || `מנוי ${planId}`;
    
    // Ensure productName is within limits and doesn't have special characters
    if (productName.length > 90) {
      productName = productName.substring(0, 90);
    }
    // Remove special characters that might cause issues
    productName = productName.replace(/["\\:\/]/g, "");

    // For monthly plan or token-only operations, set amount
    if (operation === 3) { // CreateTokenOnly
      // For token-only operations, amount can be 0 but must exist
      amount = 0;
    } else {
      // For charge operations, must be > 0
      amount = plan.price || 0;
      
      // If the amount is 0 and we're trying to charge, set a minimal value
      if (amount === 0 && operation !== 3) {
        amount = 0.01; // Minimum amount to avoid error
      }
    }

    logStep("CARDCOM-IFRAME", "Plan details", { 
      planId, 
      productName,
      amount,
      operation
    });

    // Generate unique ID for session
    const lowProfileId = crypto.randomUUID();

    // Determine base URLs for redirects
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || requestOrigin;
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || 
      `${supabaseUrl}/functions/v1`;

    // Create payment session in DB
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId,
        anonymous_data: !userId ? { 
          email, 
          fullName, 
          phone, 
          idNumber, 
          createdAt: new Date().toISOString() 
        } : null,
        plan_id: planId,
        amount: amount,
        currency: "ILS",
        status: 'initiated',
        operation_type: operation === 1 ? "ChargeOnly" : (operation === 2 ? "ChargeAndCreateToken" : "CreateTokenOnly"),
        reference: transactionRef,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payment_details: { 
          fullName, 
          email, 
          phone, 
          idNumber 
        },
        low_profile_id: lowProfileId
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error("Database insert error:", sessionError);
      throw new Error("Failed to create payment session: " + sessionError.message);
    }

    logStep("CARDCOM-IFRAME", "Created payment session", {
      sessionId: sessionData.id,
      lowProfileId,
      operation,
      amount
    });
    
    // For the Low Profile Create API
    const lowProfileApiUrl = "https://secure.cardcom.solutions/api/v11/LowProfile/Create";
    
    // Convert amount to agorot (multiply by 100) - CardCom format
    const amountInAgorot = Math.round(amount * 100);
    
    // Prepare the request body for the API - WITHOUT redirect URLs (to avoid CSP issues)
    const lowProfileApiBody: any = {
      TerminalNumber: parseInt(terminalNumber),
      ApiName: apiName,
      ReturnValue: encodeURIComponent(sessionData.id), // Use encoded session ID as return value for better tracking
      Amount: amountInAgorot, // Amount in agorot
      WebHookUrl: `${publicFunctionsUrl}/cardcom-webhook`,
      ProductName: productName,
      Language: "he",
      ISOCoinId: 1, // ILS
      Operation: operation, // Use numeric operation code
      UIDefinition: {
        CardOwnerNameValue: fullName,
        CardOwnerEmailValue: email,
        CardOwnerPhoneValue: phone,
        CardOwnerIdValue: idNumber
      }
    };
    
    // Add JValidateType only when Operation = 2 (ChargeAndCreateToken)
    if (operation === 2) {
      lowProfileApiBody.JValidateType = 5;
    }
    
    // Add JValidateOptionalFields if enableJValidateOptionalFields is true (for retry with CVV flag)
    if (enableJValidateOptionalFields) {
      lowProfileApiBody.JValidateOptionalFields = 1;
      logStep("CARDCOM-IFRAME", "Adding JValidateOptionalFields due to CVV requirement", {
        JValidateOptionalFields: 1
      });
    }
    
    logStep("CARDCOM-IFRAME", "API request prepared", {
      url: lowProfileApiUrl,
      apiRequestBody: { 
        ...lowProfileApiBody, 
        TerminalNumber: "REDACTED", 
        ApiName: "REDACTED" 
      }
    });

    // Now let's try using the CardCom API to create the LowProfile
    try {
      const apiResponse = await fetch(lowProfileApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(lowProfileApiBody)
      });
      
      // Log the raw response before trying to parse it as JSON
      const responseText = await apiResponse.text();
      logStep("CARDCOM-IFRAME", "CardCom API Raw Response", {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        responseText
      });
      
      let apiResult;
      try {
        // Try to parse the response as JSON
        apiResult = JSON.parse(responseText);
        logStep("CARDCOM-IFRAME", "CardCom API Response parsed", apiResult);
      } catch (error) {
        logStep("CARDCOM-IFRAME", "Failed to parse CardCom response as JSON", {
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Return the raw response for debugging
        return new Response(
          JSON.stringify({
            success: false,
            message: "Failed to parse CardCom response",
            data: {
              rawResponse: responseText,
              status: apiResponse.status
            }
          }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      if (apiResult.ResponseCode === 0) {
        // Success - use the URL from the API response
        const cardcomUrl = apiResult.Url;
        
        // Update the session with the LowProfileId from the API
        if (apiResult.LowProfileId) {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              low_profile_id: apiResult.LowProfileId,
              payment_details: { 
                ...sessionData.payment_details,
                lowProfileId: apiResult.LowProfileId,
                url: cardcomUrl,
                enabledJValidateOptionalFields: enableJValidateOptionalFields
              }
            })
            .eq('id', sessionData.id);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment initialized successfully",
            data: {
              iframeUrl: cardcomUrl,
              url: cardcomUrl,
              sessionId: sessionData.id,
              lowProfileId: apiResult.LowProfileId || lowProfileId,
              reference: transactionRef,
              terminalNumber
            }
          }),
          { 
            status: 200, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      } else {
        // API call failed with error code
        logStep("CARDCOM-IFRAME", "API call returned error", {
          errorCode: apiResult.ResponseCode,
          errorMessage: apiResult.Description
        });
        
        return new Response(
          JSON.stringify({
            success: false,
            message: apiResult.Description || "CardCom API error",
            data: {
              responseCode: apiResult.ResponseCode,
              rawResponse: responseText
            }
          }),
          { 
            status: 400, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
    } catch (apiError) {
      // API call threw an exception
      logStep("CARDCOM-IFRAME", "API call exception", {
        error: apiError instanceof Error ? apiError.message : String(apiError)
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          message: "Error connecting to CardCom API: " + (apiError instanceof Error ? apiError.message : String(apiError)),
          data: null
        }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[CARDCOM-IFRAME] Error: ${errorMessage}`);
    
    const status = 
      errorMessage.includes("Invalid plan ID") || 
      errorMessage.includes("Missing required") ? 400 : 500;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage 
      }),
      { 
        status, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
