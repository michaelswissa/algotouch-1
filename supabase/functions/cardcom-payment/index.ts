
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logStep, validateAmount } from "../_shared/cardcom_utils.ts";

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'payment';
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
      throw new Error("Missing CardCom API configuration");
    }

    // Using let instead of const for operationType to allow modification
    let { 
      planId, 
      userId, 
      email, 
      fullName, 
      operationType = "1", // Default to ChargeOnly (1)
      isIframePrefill = false
    } = await req.json();

    await logStep(functionName, "Received request data", { 
      planId, 
      userId, 
      email,
      fullName,
      operationType,
      isIframePrefill
    });

    // Generate transaction reference
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate amount based on plan
    let amount = 0;
    
    if (planId) {
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
        
      if (planError) {
        throw new Error("Error fetching plan details");
      }
      
      if (!plan) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }
      
      // Set operation type and amount based on plan type
      switch (planId) {
        case 'monthly':
          // Monthly plan starts with free trial (amount=0)
          operationType = "3"; // CreateTokenOnly
          amount = 0; 
          break;
        case 'annual':
          // Annual plan charges immediately full amount
          operationType = "2"; // ChargeAndCreateToken
          amount = plan.price || 0;
          break;
        case 'vip':
          // VIP plan is one-time payment
          operationType = "1"; // ChargeOnly
          amount = plan.price || 0;
          break;
        default:
          throw new Error(`Unsupported plan type: ${planId}`);
      }
    }
    
    // Generate lowProfileId BEFORE database insert
    const lowProfileId = crypto.randomUUID();

    // Prepare payment details
    const paymentDetails = { 
      fullName, 
      email,
      isIframePrefill,
      planType: planId
    };

    // Prepare anonymous_data if userId is null
    // This is critical to satisfy the check_user_or_anonymous constraint
    const anonymousData = !userId ? {
      email,
      fullName,
      createdAt: new Date().toISOString()
    } : null;

    // Create payment session WITH lowProfileId included in the initial insert
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId,
        anonymous_data: anonymousData, // Add anonymous_data when userId is null
        plan_id: planId,
        amount: amount,
        currency: "ILS",
        status: 'initiated',
        operation_type: operationType,
        reference: transactionRef,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payment_details: paymentDetails,
        low_profile_id: lowProfileId  // Include lowProfileId in the initial insert
      })
      .select('id')
      .single();
      
    if (sessionError) {
      console.error("Database insert error:", sessionError);
      throw new Error("Failed to create payment session: " + sessionError.message);
    }

    await logStep(functionName, "Created payment session", { 
      sessionId: sessionData.id,
      lowProfileId,
      operationType,
      amount
    });

    // Determine the base URL for redirects based on environment or request origin
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || requestOrigin || "https://algotouch.lovable.app";
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`;

    // For iFrame prefill mode, return early with session details
    if (isIframePrefill) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment session initialized for iframe",
          data: {
            sessionId: sessionData.id,
            lowProfileId: lowProfileId,
            reference: transactionRef,
            terminalNumber,
            cardcomUrl: "https://secure.cardcom.solutions",
            apiName
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build redirect URL for standard payment flow using dynamic base URLs
    const redirectUrl = buildRedirectUrl({
      cardcomUrl: "https://secure.cardcom.solutions",
      terminalNumber,
      lowProfileId,
      transactionRef,
      amount,
      successUrl: `${frontendBaseUrl}/subscription/success`,
      failedUrl: `${frontendBaseUrl}/subscription/failed`,
      webHookUrl: `${publicFunctionsUrl}/cardcom-webhook`,
      operationType,
      fullName,
      email
    });

    await logStep(functionName, "Redirect URL created", { url: redirectUrl });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created successfully",
        data: {
          url: redirectUrl,
          sessionId: sessionData.id,
          lowProfileId: lowProfileId,
          reference: transactionRef,
          terminalNumber,
          cardcomUrl: "https://secure.cardcom.solutions"
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[CARDCOM-PAYMENT][ERROR] ${errorMessage}`);
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildRedirectUrl(params: {
  cardcomUrl: string;
  terminalNumber: string;
  lowProfileId: string;
  transactionRef: string;
  amount: number;
  successUrl: string;
  failedUrl: string;
  webHookUrl: string;
  operationType: string;
  fullName?: string;
  email?: string;
}) {
  const queryParams = new URLSearchParams({
    TerminalNumber: params.terminalNumber,
    LowProfileCode: params.lowProfileId,
    ReturnValue: params.transactionRef,
    SumToBill: params.amount.toString(),
    CoinId: '1',
    Language: 'he',
    SuccessRedirectUrl: params.successUrl,
    ErrorRedirectUrl: params.failedUrl,
    IndicatorUrl: params.webHookUrl,
    Operation: params.operationType,
    APILevel: '10',
    Codepage: '65001'
  });

  if (params.fullName) {
    queryParams.append('CardOwnerName', params.fullName);
  }
  if (params.email) {
    queryParams.append('CardOwnerEmail', params.email);
  }

  return `${params.cardcomUrl}/Interface/LowProfile.aspx?${queryParams.toString()}`;
}
