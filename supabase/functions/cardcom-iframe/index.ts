
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

    // Get CardCom configuration - using production terminal info
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";

    if (!terminalNumber || !apiName) {
      throw new Error("Missing CardCom API configuration");
    }

    const requestData = await req.json();
    logStep("CARDCOM-IFRAME", "Request data received", requestData);

    // Validate required parameters
    const { 
      planId, 
      userId, 
      email, 
      fullName, 
      phone,
      idNumber
    } = requestData;

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

    // Determine base URLs for redirects - fixed to avoid double slashes
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || 
      (requestOrigin?.endsWith("/") ? requestOrigin.slice(0, -1) : requestOrigin || "https://algotouch.lovable.app");
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
      console.error("Database insert error:", sessionError);
      throw new Error("Failed to create payment session: " + sessionError.message);
    }

    logStep("CARDCOM-IFRAME", "Created payment session", {
      sessionId: sessionData.id,
      lowProfileId,
      operation,
      amount
    });

    // Define redirect URLs including session information
    // *** IMPORTANT: Updated to use our own redirect pages that will communicate with the parent window ***
    const successRedirectUrl = `${frontendBaseUrl}/payment-redirect-success.html?session_id=${sessionData.id}&ref=${transactionRef}`;
    const failedRedirectUrl = `${frontendBaseUrl}/payment-redirect-failed.html?session_id=${sessionData.id}&ref=${transactionRef}`;
    const webhookUrl = `${publicFunctionsUrl}/cardcom-webhook`;
    
    logStep("CARDCOM-IFRAME", "Redirect URLs generated", {
      successRedirectUrl,
      failedRedirectUrl,
      webhookUrl
    });
    
    // For the Low Profile Create API, need to create a proper URL
    const lowProfileApiUrl = "https://secure.cardcom.solutions/api/v11/LowProfile/Create";
    
    // Updated request body for CardCom API with correct terminal info
    const lowProfileApiBody = {
      TerminalNumber: parseInt(terminalNumber),
      ApiName: apiName,
      ReturnValue: transactionRef,
      Amount: amount,
      SuccessRedirectUrl: successRedirectUrl,
      FailedRedirectUrl: failedRedirectUrl,
      WebHookUrl: webhookUrl,
      ProductName: productName,
      Language: "he",
      ISOCoinId: 1, // ILS
      Operation: operation,
      UIDefinition: {
        CardOwnerNameValue: fullName,
        CardOwnerEmailValue: email,
        CardOwnerPhoneValue: phone,
        CardOwnerIdValue: idNumber
      }
    };
    
    // Log the prepared request
    logStep("CARDCOM-IFRAME", "Prepared request for CardCom API", {
      terminalNumber,
      operation,
      amount,
      successRedirectUrl,
      failedRedirectUrl
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
      
      const apiResult = await apiResponse.json();
      logStep("CARDCOM-IFRAME", "CardCom API Response", apiResult);
      
      if (apiResult.ResponseCode === 0) {
        // Success - use the URL from the API response
        const cardcomUrl = apiResult.Url || apiResult.url;
        
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
        // API call failed with error
        throw new Error(`CardCom API Error: Code ${apiResult.ResponseCode}, ${apiResult.Description}`);
      }
    } catch (apiError) {
      // API call threw an exception
      logStep("CARDCOM-IFRAME", "CardCom API Error", {
        error: apiError instanceof Error ? apiError.message : String(apiError)
      });
      
      throw new Error(`Failed to initialize payment: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
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
