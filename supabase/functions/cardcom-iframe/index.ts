
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CARDCOM-IFRAME] Function started');

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

    const { 
      planId, 
      userId, 
      email, 
      fullName, 
      phone,
      idNumber,
      operationType = "1"
    } = await req.json();

    console.log(`[CARDCOM-IFRAME] Received request data: planId=${planId}, email=${email}, fullName=${fullName}, operationType=${operationType}, hasPhone=${!!phone}, hasIdNumber=${!!idNumber}`);

    // Validate required parameters
    if (!email || !fullName) {
      throw new Error("Missing required parameters: email and fullName are required");
    }

    if (!phone || !idNumber) {
      throw new Error("Missing required parameters: phone and idNumber are required");
    }

    // Generate transaction reference
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate amount and product name based on plan
    let amount = 0;
    let productName = "Subscription";

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

    console.log(`[CARDCOM-IFRAME] Created payment session in DB: sessionId=${sessionData.id}, lowProfileId=${lowProfileId}, operationType=${operationType}, amount=${amount}`);

    // Determine base URLs for redirects
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || requestOrigin || "https://algotouch.lovable.app";
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`;

    // Build CardCom request URL with all parameters
    const cardcomUrl = "https://secure.cardcom.solutions";
    
    const queryParams = new URLSearchParams({
      TerminalNumber: terminalNumber,
      UserName: apiName,
      LowProfileCode: lowProfileId,
      ReturnValue: transactionRef,
      SumToBill: amount.toString(),
      CoinId: '1', // ILS
      Language: 'he',
      ProductName: productName,
      SuccessRedirectUrl: `${frontendBaseUrl}/subscription/success?session_id=${sessionData.id}&ref=${transactionRef}`,
      ErrorRedirectUrl: `${frontendBaseUrl}/subscription/failed?session_id=${sessionData.id}&ref=${transactionRef}`,
      IndicatorUrl: `${publicFunctionsUrl}/cardcom-webhook`,
      Operation: operationType,
      APILevel: '10',
      Codepage: '65001'
    });
    
    // Add card owner details
    queryParams.append('CardOwnerName', fullName);
    queryParams.append('CardOwnerEmail', email);
    queryParams.append('CardOwnerPhone', phone);
    queryParams.append('CardOwnerId', idNumber);
    
    const initialCardcomUrl = `${cardcomUrl}/Interface/LowProfile.aspx?${queryParams.toString()}`;

    console.log(`[CARDCOM-IFRAME] Built CardCom request URL: ${initialCardcomUrl}`);

    // Make the request to CardCom to get the iframe URL
    const cardcomResponse = await fetch(initialCardcomUrl);
    const cardcomResponseText = await cardcomResponse.text();

    console.log(`[CARDCOM-IFRAME] CardCom response status: ${cardcomResponse.status}`);
    console.log(`[CARDCOM-IFRAME] CardCom response: ${cardcomResponseText}`);

    if (!cardcomResponse.ok) {
      throw new Error(`CardCom request failed with status ${cardcomResponse.status}: ${cardcomResponseText}`);
    }

    // Parse the response from CardCom
    const responseParams = new URLSearchParams(cardcomResponseText);
    const responseCode = responseParams.get('ResponseCode');
    const description = responseParams.get('Description');
    const iframeUrl = responseParams.get('url');

    if (responseCode !== '0') {
      throw new Error(`CardCom returned an error: Code ${responseCode} - ${description}`);
    }

    if (!iframeUrl) {
      throw new Error('CardCom response successful (Code 0) but missing URL parameter');
    }

    console.log(`[CARDCOM-IFRAME] CardCom iframe URL: ${iframeUrl}`);

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
