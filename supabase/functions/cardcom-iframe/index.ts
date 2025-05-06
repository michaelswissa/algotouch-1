
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
    // Log environment variables for debugging (redacted sensitive values in production)
    console.log(JSON.stringify({
      term: Deno.env.get('CARDCOM_TERMINAL_NUMBER') ? 'exists' : 'missing',
      api: Deno.env.get('CARDCOM_API_NAME') ? 'exists' : 'missing',
      supabaseUrl: Deno.env.get('SUPABASE_URL') ? 'exists' : 'missing',
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'exists' : 'missing'
    }));
    
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

    // Log the request content type
    logStep("CARDCOM-IFRAME", "Request headers", { 
      contentType: req.headers.get("Content-Type") 
    });

    let requestData;
    try {
      requestData = await req.json();
      logStep("CARDCOM-IFRAME", "Request data received", requestData);
    } catch (parseError) {
      logStep("CARDCOM-IFRAME", "JSON parse error", { error: parseError.message });
      throw new Error(`Invalid JSON body: ${parseError.message}`);
    }

    // Validate required parameters
    const { 
      planId, 
      userId, 
      email, 
      fullName, 
      phone,
      idNumber
    } = requestData;

    // Log validation for required fields
    logStep("CARDCOM-IFRAME", "Validating required fields", {
      hasPlanId: Boolean(planId),
      hasUserId: Boolean(userId),
      hasEmail: Boolean(email), 
      hasFullName: Boolean(fullName),
      hasPhone: Boolean(phone),
      hasIdNumber: Boolean(idNumber)
    });

    // Map operation type based on request
    let operation = "ChargeOnly"; // Default
    if (requestData.operationType === "CreateTokenOnly" || requestData.operationType === "token_only") {
      operation = "CreateTokenOnly";
    } else if (planId === 'monthly') {
      // For monthly plan, always use token only (initial registration without payment)
      operation = "CreateTokenOnly";
    }

    logStep("CARDCOM-IFRAME", "Operation determined", { operation });

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
    let productName = "Subscription";

    // Map plan ID to appropriate operation and amount
    logStep("CARDCOM-IFRAME", "Fetching plan details", { planId });
    
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (planError) {
      logStep("CARDCOM-IFRAME", "Plan fetch error", { error: planError.message });
      throw new Error(`Error fetching plan details: ${planError.message}`);
    }
    
    if (!plan) {
      logStep("CARDCOM-IFRAME", "Plan not found", { planId });
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    productName = plan.name || `Plan ${planId}`;
    amount = plan.price || 0;

    // For monthly plan or token-only operation, amount should be 0
    if (planId === 'monthly' || operation === "CreateTokenOnly") {
      amount = 0;
    }

    logStep("CARDCOM-IFRAME", "Plan details", { 
      planId, 
      productName,
      amount,
      operation
    });

    // Generate unique ID for session
    const lowProfileId = crypto.randomUUID();

    // Determine base URLs for webhooks
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || 
      `${supabaseUrl}/functions/v1`;

    // Create payment session in DB
    logStep("CARDCOM-IFRAME", "Creating payment session", {
      userId,
      planId,
      amount,
      operation_type: operation
    });
    
    try {
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
          operation_type: operation,
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
        logStep("CARDCOM-IFRAME", "Database insert error", { error: sessionError.message });
        throw new Error("Failed to create payment session: " + sessionError.message);
      }
      
      logStep("CARDCOM-IFRAME", "Created payment session", {
        sessionId: sessionData.id,
        lowProfileId,
        operation,
        amount
      });

      // Prepare the request body for the CardCom API
      // Following solution A - no redirect URLs, rely only on webhook
      const lowProfileApiUrl = "https://secure.cardcom.solutions/Interface/LowProfile.aspx";
      
      // Convert operation to CardCom format
      // ChargeOnly = 1, ChargeAndCreateToken = 2, CreateTokenOnly = 3
      const cardcomOperationCode = operation === "CreateTokenOnly" ? 3 : 
                                  operation === "ChargeAndCreateToken" ? 2 : 1;
      
      const lowProfileApiBody = {
        TerminalNumber: parseInt(terminalNumber),
        UserName: apiName,
        ReturnValue: sessionData.id, // Store session ID in ReturnValue for webhook
        Sum: amount * 100, // Amount in agorot/cents
        CoinID: 1, // ILS
        Language: "he",
        ProductName: productName,
        Operation: cardcomOperationCode,
        createTokenJValidateType: 5, // Required in production, this creates a real authorization
        // No JValidateOptionalFields by default - add only if Cardcom returns error 103
        IndicatorUrl: `${publicFunctionsUrl}/cardcom-webhook`,
        APILevel: 10,
        UIDefinition: {
          CardOwnerNameValue: fullName,
          CardOwnerEmailValue: email,
          CardOwnerPhoneValue: phone,
          CardOwnerIdValue: idNumber
        }
      };
      
      logStep("CARDCOM-IFRAME", "CardCom API request", {
        ...lowProfileApiBody,
        TerminalNumber: "REDACTED",
        UserName: "REDACTED"
      });

      // Call CardCom API to create LowProfile
      try {
        const apiResponse = await fetch(lowProfileApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(lowProfileApiBody)
        });
        
        // Log response status before parsing JSON
        logStep("CARDCOM-IFRAME", "CardCom API Response Status", { 
          status: apiResponse.status,
          statusText: apiResponse.statusText
        });
        
        // Get the raw response text first for logging
        const responseText = await apiResponse.text();
        logStep("CARDCOM-IFRAME", "CardCom API Raw Response", { 
          responseText: responseText.substring(0, 1000) // Limit in case it's very large
        });
        
        // Try to parse the response as JSON
        let apiResult;
        try {
          apiResult = JSON.parse(responseText);
          logStep("CARDCOM-IFRAME", "CardCom API Response Parsed", apiResult);
        } catch (jsonError) {
          logStep("CARDCOM-IFRAME", "Failed to parse CardCom response as JSON", { 
            error: jsonError.message 
          });
          throw new Error(`CardCom API returned non-JSON response: ${responseText.substring(0, 200)}...`);
        }
        
        if (apiResult.ResponseCode === 0) {
          // Success - use the URL from the API response
          const cardcomUrl = apiResult.url || apiResult.Url;
          
          // Update the session with the LowProfileId from the API
          if (apiResult.LowProfileId) {
            await supabaseAdmin
              .from('payment_sessions')
              .update({
                low_profile_id: apiResult.LowProfileId,
                payment_details: { 
                  ...sessionData.payment_details,
                  lowProfileId: apiResult.LowProfileId,
                  url: cardcomUrl
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
                terminalNumber,
                LowProfileId: apiResult.LowProfileId || lowProfileId
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
        } else if (apiResult.ResponseCode === 103 && !lowProfileApiBody.hasOwnProperty('JValidateOptionalFields')) {
          // If we get error 103, try again with JValidateOptionalFields = 1
          logStep("CARDCOM-IFRAME", "Received error 103, retrying with JValidateOptionalFields=1", apiResult);
          
          // Add JValidateOptionalFields and retry
          lowProfileApiBody.JValidateOptionalFields = 1;
          
          logStep("CARDCOM-IFRAME", "Retry with JValidateOptionalFields=1", {
            ...lowProfileApiBody,
            TerminalNumber: "REDACTED",
            UserName: "REDACTED"
          });
          
          const retryResponse = await fetch(lowProfileApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(lowProfileApiBody)
          });
          
          // Log retry response status before parsing JSON
          logStep("CARDCOM-IFRAME", "Retry Response Status", { 
            status: retryResponse.status,
            statusText: retryResponse.statusText
          });
          
          // Get the raw retry response text for logging
          const retryResponseText = await retryResponse.text();
          logStep("CARDCOM-IFRAME", "Retry Raw Response", { 
            responseText: retryResponseText.substring(0, 1000)
          });
          
          // Try to parse the retry response as JSON
          let retryResult;
          try {
            retryResult = JSON.parse(retryResponseText);
            logStep("CARDCOM-IFRAME", "Retry Response Parsed", retryResult);
          } catch (jsonError) {
            logStep("CARDCOM-IFRAME", "Failed to parse retry response as JSON", { 
              error: jsonError.message 
            });
            throw new Error(`CardCom API returned non-JSON response on retry: ${retryResponseText.substring(0, 200)}...`);
          }
          
          if (retryResult.ResponseCode === 0) {
            const cardcomUrl = retryResult.url || retryResult.Url;
            
            // Update the session with the LowProfileId from the API
            if (retryResult.LowProfileId) {
              await supabaseAdmin
                .from('payment_sessions')
                .update({
                  low_profile_id: retryResult.LowProfileId,
                  payment_details: { 
                    ...sessionData.payment_details,
                    lowProfileId: retryResult.LowProfileId,
                    url: cardcomUrl
                  }
                })
                .eq('id', sessionData.id);
            }
            
            return new Response(
              JSON.stringify({
                success: true,
                message: "Payment initialized successfully (with JValidateOptionalFields=1)",
                data: {
                  iframeUrl: cardcomUrl,
                  url: cardcomUrl,
                  sessionId: sessionData.id,
                  lowProfileId: retryResult.LowProfileId || lowProfileId,
                  reference: transactionRef,
                  terminalNumber,
                  LowProfileId: retryResult.LowProfileId || lowProfileId
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
            logStep("CARDCOM-IFRAME", "Retry failed", retryResult);
            throw new Error(`CardCom API error on retry: ${retryResult.Description || "Unknown error"} (code: ${retryResult.ResponseCode})`);
          }
        } else {
          logStep("CARDCOM-IFRAME", "CardCom API error", apiResult);
          throw new Error(`CardCom API error: ${apiResult.Description || "Unknown error"} (code: ${apiResult.ResponseCode})`);
        }
      } catch (apiError) {
        logStep("CARDCOM-IFRAME", "API call exception", {
          error: apiError instanceof Error ? apiError.message : String(apiError)
        });
        
        throw apiError;
      }
    } catch (dbError) {
      logStep("CARDCOM-IFRAME", "Database operation error", {
        error: dbError instanceof Error ? dbError.message : String(dbError)
      });
      throw dbError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logStep("CARDCOM-IFRAME", "Error", { message: errorMessage });
    
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
