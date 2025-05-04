
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";

// Helper function to log steps and data
function logStep(functionName: string, step: string, data: any = {}) {
  console.log(`[${functionName}][${step}]`, JSON.stringify(data));
}

// Helper function to parse CardCom response
function parseCardComResponse(responseText: string): Record<string, string> {
  try {
    const params = new URLSearchParams(responseText);
    const result: Record<string, string> = {};
    
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    
    return result;
  } catch (error) {
    console.error("Error parsing CardCom response:", error);
    return { error: "Failed to parse response" };
  }
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
      operationType = "1" // Default to ChargeOnly (1)
    } = requestData;

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
    let operation = operationType;

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

    // Determine operation based on plan
    if (planId === 'monthly') {
      // For monthly plan, use CreateTokenOnly (operation 3) with amount = 0
      operation = "3";
      amount = 0;
    } else if (planId === 'annual') {
      // For annual plan, use ChargeAndCreateToken (operation 2)
      operation = "2";
      amount = plan.price || 0;
    } else {
      // For other plans (like VIP), use ChargeOnly (operation 1)
      operation = "1";
      amount = plan.price || 0;
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
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || 
      requestOrigin || 
      "https://algotouch.lovable.app";
    
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

    // Build CardCom request URL
    const cardcomBaseUrl = "https://secure.cardcom.solutions";
    const queryParams = new URLSearchParams();
    
    // Basic parameters
    queryParams.append('TerminalNumber', terminalNumber);
    queryParams.append('ApiName', apiName);
    queryParams.append('ReturnValue', transactionRef);
    queryParams.append('Amount', amount.toString());
    queryParams.append('CoinId', '1'); // ILS
    queryParams.append('Language', 'he');
    queryParams.append('ProductName', productName);
    queryParams.append('Operation', operation);
    
    // Redirect URLs
    queryParams.append('SuccessRedirectUrl', 
      `${frontendBaseUrl}/subscription/success?session_id=${sessionData.id}&ref=${transactionRef}`);
    queryParams.append('FailedRedirectUrl', 
      `${frontendBaseUrl}/subscription/failed?session_id=${sessionData.id}&ref=${transactionRef}`);
    queryParams.append('WebHookUrl', 
      `${publicFunctionsUrl}/cardcom-webhook`);
    
    // Cardholder information
    queryParams.append('CardOwnerName', fullName);
    queryParams.append('CardOwnerEmail', email);
    queryParams.append('CardOwnerPhone', phone);
    queryParams.append('CardOwnerId', idNumber);
    
    // UI definition (pre-fill fields)
    queryParams.append('UIDefinition.CardOwnerNameValue', fullName);
    queryParams.append('UIDefinition.CardOwnerEmailValue', email);
    queryParams.append('UIDefinition.CardOwnerPhoneValue', phone);
    queryParams.append('UIDefinition.CardOwnerIdValue', idNumber);
    
    // Generate the CardCom LowProfile URL
    const cardcomUrl = `${cardcomBaseUrl}/Interface/LowProfile.aspx?${queryParams.toString()}`;
    
    logStep("CARDCOM-IFRAME", "Making request to CardCom", { url: cardcomUrl });

    // Make the request to CardCom
    const cardcomResponse = await fetch(cardcomUrl);
    const cardcomResponseText = await cardcomResponse.text();
    
    logStep("CARDCOM-IFRAME", "CardCom response", {
      status: cardcomResponse.status,
      response: cardcomResponseText
    });

    // Parse the response
    const parsedResponse = parseCardComResponse(cardcomResponseText);
    
    // Check if the request was successful
    if (parsedResponse.ResponseCode !== '0') {
      throw new Error(`CardCom returned an error: Code ${parsedResponse.ResponseCode} - ${parsedResponse.Description}`);
    }
    
    // Check if we got a URL back
    if (!parsedResponse.Url) {
      throw new Error("CardCom response did not include iframe URL");
    }
    
    // Update the payment session with the iframe URL
    await supabaseAdmin
      .from('payment_sessions')
      .update({
        payment_details: {
          ...sessionData.payment_details,
          iframeUrl: parsedResponse.Url
        }
      })
      .eq('id', sessionData.id);

    // Return success response with iframe URL
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment initialized successfully",
        data: {
          iframeUrl: parsedResponse.Url,
          sessionId: sessionData.id,
          lowProfileId: lowProfileId,
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

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[CARDCOM-IFRAME] Error: ${errorMessage}`);
    
    const status = 
      errorMessage.includes("Invalid plan ID") || 
      errorMessage.includes("Missing required") ||
      errorMessage.includes("CardCom returned an error")
        ? 400 : 500;
    
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
