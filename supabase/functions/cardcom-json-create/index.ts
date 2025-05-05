
// Note: Some parts of this file exist already - we're updating with production-ready settings

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Helper for CORS headers
const getCorsHeaders = (origin: string | null): HeadersInit => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://algotouch.lovable.app'
  ];
  
  const allowedOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : 'https://algotouch.lovable.app';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

// Helper for logging
const logStep = async (functionName: string, step: string, details?: any) => {
  console.log(`[CARDCOM-${functionName.toUpperCase()}][INFO][${new Date().toISOString()}] ${step}${details ? ' - ' + JSON.stringify(details) : ''}`);
};

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const functionName = 'cardcom-json-create';

  try {
    await logStep(functionName, "Function started");

    // --- 1. Get Configuration ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const terminalNumber = 160138; // Production terminal number
    const apiName = "bLaocQRMSnwphQRUVG3b"; // Production API username
    const cardComApiUrl = "https://secure.cardcom.solutions/api/v11/LowProfile/Create";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration environment variables");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- 2. Get Request Body & Card Owner Details ---
    const { 
      planId, 
      userId, 
      fullName, 
      email, 
      phone, 
      idNumber 
    } = await req.json();

    // Basic validation for required fields
    if (!planId || !fullName || !email || !phone || !idNumber) {
      throw new Error("Missing required fields in request: planId, fullName, email, phone, idNumber are required.");
    }

    await logStep(functionName, "Received request data", { 
      planId, userId, email, fullName, hasPhone: Boolean(phone), hasId: Boolean(idNumber) 
    });

    // --- 3. Determine Plan Logic (Operation & Amount) ---
    let amount = 0;
    let operation = "ChargeOnly"; // Production value, no test flags

    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('price, name')
      .eq('id', planId)
      .maybeSingle();

    if (planError) throw new Error(`Error fetching plan details: ${planError.message}`);
    if (!plan) throw new Error(`Invalid plan ID: ${planId}`);

    const planPrice = plan.price || 0;
    const productName = plan.name || `Plan ${planId}`;
    
    // PRODUCTION VALUES - no test flags
    if (planId === 'monthly') {
      operation = "ChargeAndCreateToken"; 
      amount = planPrice;
    } else if (planId === 'annual') {
      operation = "ChargeOnly";
      amount = planPrice;
    } else {
      operation = "ChargeOnly";
      amount = planPrice;
    }
    
    await logStep(functionName, "Plan logic determined", { planId, operation, amount });

    // --- 4. Prepare DB Record --- 
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const paymentDetails = { fullName, email, phone, idNumber, planType: planId };
    const anonymousData = !userId ? { email, fullName, phone, idNumber, createdAt: new Date().toISOString() } : null;

    // --- 5. Create Payment Session in DB ---
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId,
        anonymous_data: anonymousData,
        plan_id: planId,
        amount: amount,
        currency: "ILS",
        status: 'initiated',
        operation_type: operation,
        reference: transactionRef,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payment_details: paymentDetails,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error("Database insert error:", sessionError);
      throw new Error("Failed to create payment session: " + sessionError.message);
    }
    const sessionId = sessionData.id;
    await logStep(functionName, "Created payment session in DB", { sessionId });

    // --- 6. Prepare JSON Payload for CardCom API ---
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || requestOrigin || "https://algotouch.lovable.app";
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`;

    const cardComPayload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      Operation: operation,
      Amount: amount,
      CoinId: 1, // ILS
      Language: "he",
      ReturnValue: transactionRef,
      SuccessRedirectUrl: `${frontendBaseUrl}/subscription/success?session_id=${sessionId}&ref=${transactionRef}`,
      FailedRedirectUrl: `${frontendBaseUrl}/subscription/failed?session_id=${sessionId}&ref=${transactionRef}`,
      WebHookUrl: `${publicFunctionsUrl}/cardcom-webhook`,
      Customer: {
        Name: fullName,
        Email: email,
        Phone: phone,
        IdentityNumber: idNumber
      }
    };

    await logStep(functionName, "Prepared JSON payload for CardCom", { operation, amount });

    // --- 7. Make POST Request to CardCom JSON API --- 
    const cardcomResponse = await fetch(cardComApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardComPayload)
    });

    await logStep(functionName, "Sent request to CardCom JSON API", { status: cardcomResponse.status });

    // --- 8. Parse CardCom JSON Response & Extract Final URL ---
    if (!cardcomResponse.ok) {
      const errorText = await cardcomResponse.text();
      throw new Error(`CardCom API request failed with status ${cardcomResponse.status}: ${errorText}`);
    }

    const responseJson = await cardcomResponse.json();
    
    // Check for application-level errors
    if (responseJson.ResponseCode && responseJson.ResponseCode !== 0) {
      throw new Error(`CardCom API returned error: Code ${responseJson.ResponseCode} - ${responseJson.Description}`);
    }

    const finalIframeUrl = responseJson.Url;
    const lowProfileCode = responseJson.LowProfileId;

    if (!finalIframeUrl) {
      throw new Error(`CardCom JSON response successful but missing 'Url' parameter.`);
    }
    await logStep(functionName, "Successfully obtained final iframe URL via JSON API", { lowProfileCode });

    // Update payment_sessions with LowProfileCode
    const { error: updateError } = await supabaseAdmin
      .from('payment_sessions')
      .update({ low_profile_id: lowProfileCode })
      .eq('id', sessionId);
      
    if (updateError) {
      await logStep(functionName, "[WARN] Failed to update session with LowProfileCode", { sessionId, lowProfileCode, error: updateError.message });
    }

    // --- 9. Return Final URL to Frontend --- 
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session initialized successfully via JSON API. Use iframeUrl.",
        data: {
          iframeUrl: finalIframeUrl,
          sessionId: sessionId,
          lowProfileId: lowProfileCode,
          lowProfileCode: lowProfileCode, // For backward compatibility
          reference: transactionRef
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[${functionName}][ERROR] ${errorMessage}`);
    const status = (errorMessage.includes("Invalid plan ID") || errorMessage.includes("Missing required fields")) ? 400 : 500;
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
