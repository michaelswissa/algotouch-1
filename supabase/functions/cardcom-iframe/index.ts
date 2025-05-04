
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logStep } from "../_shared/cardcom_utils.ts";

// Helper function to parse CardCom response
function parseCardComResponse(text: string): { [key: string]: string } {
  const params = new URLSearchParams(text);
  const result: { [key: string]: string } = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
}

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await logStep("CARDCOM-IFRAME", "Function started");

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
      throw new Error("Missing CardCom API configuration (TerminalNumber or UserName)");
    }

    const requestData = await req.json();
    const { 
      planId, 
      userId, 
      email, 
      fullName, 
      phone,
      idNumber,
      operationType: requestedOperationType = "1" // Default to ChargeOnly (1)
    } = requestData;

    await logStep("CARDCOM-IFRAME", "Received request data", { 
      planId, 
      email, 
      fullName, 
      operationType: requestedOperationType,
      hasPhone: !!phone,
      hasIdNumber: !!idNumber
    });

    // Validate required parameters
    if (!email || !fullName) {
      throw new Error("Missing required parameters: email and fullName are required");
    }

    if (!phone || !idNumber) {
      throw new Error("Missing required parameters: phone and idNumber are required");
    }

    // Generate transaction reference
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Calculate amount and determine operation type based on plan
    let amount = 0;
    let productName = "Subscription";
    let operationType = requestedOperationType;

    if (planId) {
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();

      if (planError) throw new Error(`Error fetching plan details: ${planError.message}`);
      if (!plan) throw new Error(`Invalid plan ID: ${planId}`);

      productName = plan.name || `Plan ${planId}`;

      // Determine Operation based on plan
      switch (planId) {
        case 'monthly':
          operationType = "3"; // CreateTokenOnly
          amount = 0;
          break;
        case 'annual':
          operationType = "2"; // ChargeAndCreateToken
          amount = plan.price || 0;
          break;
        case 'vip':
          operationType = "1"; // ChargeOnly
          amount = plan.price || 0;
          break;
        default:
          throw new Error(`Unsupported plan type: ${planId}`);
      }
    } else {
      throw new Error("Plan ID is required for payment initialization");
    }

    // Generate unique ID for session
    const lowProfileId = crypto.randomUUID();

    // Determine base URLs for redirects
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || requestOrigin || "https://algotouch.lovable.app";
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`;

    // Prepare payment details for DB logging
    const paymentDetails = { 
      fullName, 
      email, 
      phone, 
      idNumber 
    };

    // Prepare anonymous_data if userId is null
    const anonymousData = !userId ? { email, fullName, phone, idNumber, createdAt: new Date().toISOString() } : null;

    // Create payment session in DB
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId,
        anonymous_data: anonymousData,
        plan_id: planId,
        amount: amount,
        currency: "ILS",
        status: 'initiated',
        operation_type: operationType,
        reference: transactionRef,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payment_details: paymentDetails,
        low_profile_id: lowProfileId
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error("[CARDCOM-IFRAME] Database insert error:", sessionError);
      throw new Error("Failed to create payment session: " + sessionError.message);
    }

    await logStep("CARDCOM-IFRAME", "Created payment session in DB", {
      sessionId: sessionData.id,
      lowProfileId,
      operationType,
      amount
    });

    // Build CardCom request URL with all parameters
    const cardcomBaseUrl = "https://secure.cardcom.solutions";
    
    // Create a URLSearchParams object to properly encode parameters
    const queryParams = new URLSearchParams();
    
    // Add required parameters
    queryParams.append('TerminalNumber', terminalNumber);
    queryParams.append('ApiName', apiName);
    queryParams.append('ReturnValue', transactionRef);
    queryParams.append('Amount', amount.toString());
    queryParams.append('CoinId', '1'); // ILS
    queryParams.append('Language', 'he');
    queryParams.append('ProductName', productName);
    queryParams.append('Operation', operationType);
    
    // Add redirect URLs
    queryParams.append('SuccessRedirectUrl', 
      `${frontendBaseUrl}/subscription/success?session_id=${sessionData.id}&ref=${transactionRef}`);
    queryParams.append('FailedRedirectUrl', 
      `${frontendBaseUrl}/subscription/failed?session_id=${sessionData.id}&ref=${transactionRef}`);
    queryParams.append('WebHookUrl', 
      `${publicFunctionsUrl}/cardcom-webhook`);
    
    // Add cardholder details
    queryParams.append('CardOwnerName', fullName);
    queryParams.append('CardOwnerEmail', email);
    queryParams.append('CardOwnerPhone', phone);
    queryParams.append('CardOwnerId', idNumber);
    
    // Add UI customization params using proper syntax
    queryParams.append('UIDefinition.IsHideCardOwnerName', 'false');
    queryParams.append('UIDefinition.IsHideCardOwnerPhone', 'false');
    queryParams.append('UIDefinition.IsHideCardOwnerEmail', 'false');
    queryParams.append('UIDefinition.IsHideCardOwnerIdentityNumber', 'false');
    queryParams.append('UIDefinition.CardOwnerNameValue', fullName);
    queryParams.append('UIDefinition.CardOwnerEmailValue', email);
    queryParams.append('UIDefinition.CardOwnerPhoneValue', phone);
    queryParams.append('UIDefinition.CardOwnerIdValue', idNumber);
    
    // Generate the CardCom URL
    const cardcomUrl = `${cardcomBaseUrl}/Interface/LowProfile.aspx?${queryParams.toString()}`;
    
    await logStep("CARDCOM-IFRAME", "Built CardCom request URL");

    // Make the request to CardCom to get the iframe URL
    const cardcomResponse = await fetch(cardcomUrl);
    const cardcomResponseText = await cardcomResponse.text();

    await logStep("CARDCOM-IFRAME", "CardCom response", {
      status: cardcomResponse.status,
      response: cardcomResponseText
    });

    if (!cardcomResponse.ok) {
      throw new Error(`CardCom request failed with status ${cardcomResponse.status}: ${cardcomResponseText}`);
    }

    // Parse the response from CardCom
    const parsedResponse = parseCardComResponse(cardcomResponseText);
    const responseCode = parsedResponse.ResponseCode;
    const description = parsedResponse.Description;
    const iframeUrl = parsedResponse.Url;

    if (responseCode !== '0') {
      throw new Error(`CardCom returned an error: Code ${responseCode} - ${description}`);
    }

    if (!iframeUrl) {
      throw new Error('CardCom response successful (Code 0) but missing URL parameter');
    }

    await logStep("CARDCOM-IFRAME", "CardCom iframe URL", { iframeUrl });

    // Return success response with the iframe URL
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session initialized successfully",
        data: {
          iframeUrl: iframeUrl,
          sessionId: sessionData.id,
          lowProfileId: lowProfileId,
          reference: transactionRef,
          terminalNumber
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[CARDCOM-IFRAME] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    const status = (errorMessage.includes("Invalid plan ID") || 
                   errorMessage.includes("Plan ID is required") || 
                   errorMessage.includes("Missing required parameters") ||
                   errorMessage.includes("CardCom returned an error")) 
                  ? 400 : 500;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage 
      }),
      { status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
