
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Helper for CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get request body
    const { planId, userId, email, fullName, phone, idNumber, operation = 'ChargeAndCreateToken' } = await req.json();

    console.log(`[CARDCOM-LOWPROFILE][INFO] Received request for plan: ${planId}, operation: ${operation}`);

    // Get configuration from environment
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const userName = Deno.env.get("CARDCOM_API_USER");
    
    if (!terminalNumber || !userName) {
      throw new Error("Missing CardCom configuration");
    }

    // Get plan amount from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('price')
      .eq('id', planId)
      .maybeSingle();

    if (planError) throw new Error(`Error fetching plan details: ${planError.message}`);
    if (!plan) throw new Error(`Invalid plan ID: ${planId}`);

    // Convert price to agorot (cents)
    const amountInAgorot = Math.round((plan.price || 0) * 100);
    
    // Create a unique reference for this transaction
    const reference = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine operation type based on plan
    let operationType = 2; // ChargeAndCreateToken
    if (planId === 'monthly') {
      operationType = 3; // CreateTokenOnly
    } else if (planId === 'vip') {
      operationType = 1; // ChargeOnly
    }

    // Get domain for redirects
    const requestOrigin = req.headers.get("Origin") || '';
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || requestOrigin || "https://algotouch.lovable.app";
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`;
    
    // Create session record
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId,
        plan_id: planId,
        amount: plan.price,
        currency: "ILS",
        status: 'initiated',
        operation_type: operation,
        reference: reference,
        payment_details: { fullName, email, phone, idNumber }
      })
      .select('id')
      .single();

    if (sessionError) {
      throw new Error(`Failed to create payment session: ${sessionError.message}`);
    }

    const sessionId = sessionData.id;

    // Create the CardCom Low Profile request
    const lowProfileRequestBody = {
      TerminalNumber: parseInt(terminalNumber, 10),
      UserName: userName,
      Sum: amountInAgorot,
      CoinID: 1, // ILS
      Language: "he",
      ProductName: planId === 'monthly' ? "מנוי חודשי" : 
                  planId === 'annual' ? "מנוי שנתי" : "מנוי VIP",
      Operation: operationType, // 1=ChargeOnly, 2=ChargeAndCreateToken, 3=TokenOnly
      createTokenJValidateType: 5, // J5 = Real authorization
      SuccessRedirectUrl: `${frontendBaseUrl}/payment-redirect-success.html?session_id=${sessionId}`,
      ErrorRedirectUrl: `${frontendBaseUrl}/payment-redirect-failed.html?session_id=${sessionId}`,
      IndicatorUrl: `${publicFunctionsUrl}/cardcom-webhook`,
      APILevel: 10,
      ReturnValue: reference
    };

    console.log("[CARDCOM-LOWPROFILE][INFO] Sending request to CardCom");

    // Make request to CardCom API
    const cardcomResponse = await fetch("https://secure.cardcom.solutions/Interface/LowProfile.aspx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(lowProfileRequestBody)
    });

    if (!cardcomResponse.ok) {
      const errorText = await cardcomResponse.text();
      throw new Error(`CardCom API request failed with status ${cardcomResponse.status}: ${errorText}`);
    }

    // Parse response
    const responseText = await cardcomResponse.text();
    console.log("[CARDCOM-LOWPROFILE][INFO] CardCom response:", responseText);

    // The response is a URL that looks like https://secure.cardcom.solutions/External/LowProfile.aspx?LowProfileCode=GUID
    // Extract the LowProfileCode
    let lowProfileCode = '';
    let paymentUrl = '';
    
    if (responseText.includes("LowProfileCode=")) {
      paymentUrl = responseText.trim();
      const urlObj = new URL(paymentUrl);
      lowProfileCode = urlObj.searchParams.get("LowProfileCode") || '';
      
      // Update session with LowProfileCode
      await supabaseAdmin
        .from('payment_sessions')
        .update({ low_profile_id: lowProfileCode })
        .eq('id', sessionId);
    } else {
      throw new Error("Invalid response from CardCom API");
    }

    // Return success with payment URL
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session initialized successfully",
        data: {
          sessionId,
          lowProfileId: lowProfileCode,
          url: paymentUrl,
          reference
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[CARDCOM-LOWPROFILE][ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
