
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logStep } from "../_shared/cardcom_utils.ts";

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'cardcom-iframe';
    await logStep(functionName, "Function started");

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
      operationType = "1", 
      isIframePrefill = false 
    } = await req.json();

    await logStep(functionName, "Received request data", { 
      planId, userId, email, fullName, operationType, isIframePrefill
    });

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

    // Generate lowProfileId BEFORE database insert
    const lowProfileId = crypto.randomUUID();

    // Prepare payment details for DB logging
    const paymentDetails = { fullName, email, isIframePrefill, planType: planId };

    // Prepare anonymous_data if userId is null
    const anonymousData = !userId ? { email, fullName, createdAt: new Date().toISOString() } : null;

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
      console.error("Database insert error:", sessionError);
      throw new Error("Failed to create payment session: " + sessionError.message);
    }

    await logStep(functionName, "Created payment session in DB", { 
      sessionId: sessionData.id, lowProfileId, operationType, amount
    });

    // Determine base URLs for redirects
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || requestOrigin || "https://algotouch.lovable.app";
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`;

    // Step 1: Build the initial request URL to CardCom
    const initialCardcomUrl = buildInitialRequestUrl({
      cardcomUrl: "https://secure.cardcom.solutions",
      terminalNumber,
      userName: apiName,
      lowProfileId,
      transactionRef,
      amount,
      productName,
      successUrl: `${frontendBaseUrl}/subscription/success?session_id=${sessionData.id}&ref=${transactionRef}`,
      failedUrl: `${frontendBaseUrl}/subscription/failed?session_id=${sessionData.id}&ref=${transactionRef}`,
      webHookUrl: `${publicFunctionsUrl}/cardcom-webhook`,
      operationType,
      fullName,
      email
    });

    await logStep(functionName, "Initial CardCom URL built", { url: initialCardcomUrl });

    // Step 2: Make the request to CardCom to get the actual iframe URL
    const cardcomResponse = await fetch(initialCardcomUrl);
    const cardcomResponseText = await cardcomResponse.text();

    await logStep(functionName, "Received response from CardCom", { 
      status: cardcomResponse.status, 
      text: cardcomResponseText 
    });

    if (!cardcomResponse.ok) {
      throw new Error(`CardCom request failed with status ${cardcomResponse.status}: ${cardcomResponseText}`);
    }

    // Step 3: Parse the response text from CardCom
    const responseParams = new URLSearchParams(cardcomResponseText);
    const responseCode = responseParams.get('ResponseCode');
    const description = responseParams.get('Description');
    const finalIframeUrl = responseParams.get('url');

    // Step 4: Check the response code from CardCom
    if (responseCode !== '0') {
      throw new Error(`CardCom returned an error: Code ${responseCode} - ${description}`);
    }

    // Step 5: Ensure the final URL was received
    if (!finalIframeUrl) {
      throw new Error(`CardCom response successful (Code 0) but missing 'url' parameter.`);
    }

    await logStep(functionName, "Successfully obtained final iframe URL", { url: finalIframeUrl });

    // Step 6: Return the final iframe URL to the frontend
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session initialized successfully. Use iframeUrl for the iframe src.",
        data: {
          iframeUrl: finalIframeUrl,
          sessionId: sessionData.id,
          lowProfileId: lowProfileId,
          reference: transactionRef,
          terminalNumber
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[CARDCOM-IFRAME][ERROR] ${errorMessage}`);
    
    const status = (errorMessage.includes("Invalid plan ID") || 
                   errorMessage.includes("Plan ID is required") || 
                   errorMessage.startsWith("CardCom returned an error")) 
                  ? 400 : 500;
    
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to build the initial URL for the server-side request to CardCom
function buildInitialRequestUrl(params: {
  cardcomUrl: string;
  terminalNumber: string;
  userName: string;
  lowProfileId: string;
  transactionRef: string;
  amount: number;
  productName: string;
  successUrl: string;
  failedUrl: string;
  webHookUrl: string;
  operationType: string;
  fullName?: string;
  email?: string;
}) {
  const queryParams = new URLSearchParams({
    TerminalNumber: params.terminalNumber,
    UserName: params.userName,
    LowProfileCode: params.lowProfileId,
    ReturnValue: params.transactionRef,
    SumToBill: params.amount.toString(),
    CoinId: '1',
    Language: 'he',
    ProductName: params.productName,
    SuccessRedirectUrl: params.successUrl,
    ErrorRedirectUrl: params.failedUrl,
    IndicatorUrl: params.webHookUrl,
    Operation: params.operationType,
    APILevel: '10',
    Codepage: '65001'
  });

  if (params.fullName) queryParams.append('CardOwnerName', params.fullName);
  if (params.email) queryParams.append('CardOwnerEmail', params.email);

  return `${params.cardcomUrl}/Interface/LowProfile.aspx?${queryParams.toString()}`;
}
