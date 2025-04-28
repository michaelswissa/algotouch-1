
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

    const { 
      planId, 
      amount: requestedAmount,
      invoiceInfo, 
      redirectUrls, 
      userId,
      registrationData,
      isIframePrefill = false,
      webhook = null
    } = await req.json();

    // Generate transaction reference
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine operation type and amount
    const { operationType, initialAmount } = await determinePaymentParameters(
      supabaseAdmin,
      planId,
      requestedAmount
    );
    
    // Create payment session
    const sessionData = await createPaymentSession(
      supabaseAdmin,
      {
        userId,
        planId,
        initialAmount,
        operationType,
        transactionRef,
        invoiceInfo,
        registrationData,
        redirectUrls,
        isIframePrefill
      }
    );

    // For iFrame prefill mode, return early with session details
    if (isIframePrefill) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment session initialized for iframe",
          data: {
            sessionId: sessionData.id,
            lowProfileId: sessionData.lowProfileId,
            reference: transactionRef,
            terminalNumber,
            cardcomUrl: "https://secure.cardcom.solutions",
            apiName
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build full redirect URL for standard payment flow
    const redirectUrl = buildRedirectUrl({
      cardcomUrl: "https://secure.cardcom.solutions",
      terminalNumber,
      lowProfileId: sessionData.lowProfileId,
      transactionRef,
      initialAmount,
      successUrl: redirectUrls?.success || `${req.headers.get('Origin') || ''}/subscription/success`,
      failedUrl: redirectUrls?.failed || `${req.headers.get('Origin') || ''}/subscription/failed`,
      webHookUrl: webhook || `${Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`}/cardcom-webhook`,
      operationType,
      invoiceInfo
    });

    await logStep(functionName, "Redirect URL created");
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created successfully",
        data: {
          url: redirectUrl,
          sessionId: sessionData.id,
          lowProfileId: sessionData.lowProfileId,
          reference: transactionRef,
          terminalNumber,
          cardcomUrl: "https://secure.cardcom.solutions"
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await logStep('payment', errorMessage, error, 'error');
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function determinePaymentParameters(supabaseAdmin: any, planId: string, requestedAmount: number) {
  let operationType = "ChargeOnly";
  let initialAmount = requestedAmount;
  
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

    switch (planId) {
      case 'monthly':
        operationType = "ChargeAndCreateToken";
        initialAmount = 0; // Free trial month
        break;
      case 'annual':
        operationType = "ChargeAndCreateToken";
        initialAmount = plan.price || requestedAmount;
        break;
      case 'vip':
        operationType = "ChargeOnly";
        initialAmount = plan.price || requestedAmount;
        break;
      default:
        throw new Error(`Unsupported plan type: ${planId}`);
    }
  }
  
  // Validate amount
  if (!validateAmount(initialAmount)) {
    throw new Error("Invalid amount");
  }

  return { operationType, initialAmount };
}

async function createPaymentSession(supabaseAdmin: any, params: {
  userId: string | null;
  planId: string;
  initialAmount: number;
  operationType: string;
  transactionRef: string;
  invoiceInfo: any;
  registrationData: any;
  redirectUrls: any;
  isIframePrefill: boolean;
}) {
  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from('payment_sessions')
    .insert({
      user_id: params.userId,
      plan_id: params.planId,
      amount: params.initialAmount,
      currency: "ILS",
      status: 'initiated',
      operation_type: params.operationType,
      reference: params.transactionRef,
      anonymous_data: !params.userId ? { invoiceInfo: params.invoiceInfo, registrationData: params.registrationData } : null,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      payment_details: { 
        invoiceInfo: params.invoiceInfo, 
        redirectUrls: params.redirectUrls,
        isIframePrefill: params.isIframePrefill,
        planType: params.planId
      }
    })
    .select('id')
    .single();
    
  if (sessionError) {
    throw new Error("Failed to create payment session");
  }

  const lowProfileId = crypto.randomUUID();
  
  await supabaseAdmin
    .from('payment_sessions')
    .update({ low_profile_id: lowProfileId })
    .eq('id', sessionData.id);

  return { ...sessionData, lowProfileId };
}

function buildRedirectUrl(params: {
  cardcomUrl: string;
  terminalNumber: string;
  lowProfileId: string;
  transactionRef: string;
  initialAmount: number;
  successUrl: string;
  failedUrl: string;
  webHookUrl: string;
  operationType: string;
  invoiceInfo: any;
}) {
  const queryParams = new URLSearchParams({
    terminalnumber: params.terminalNumber,
    lowprofilecode: params.lowProfileId,
    ReturnValue: params.transactionRef,
    sum: params.initialAmount.toString(),
    coinid: '1',
    language: 'he',
    successredirecturl: params.successUrl,
    failureredirecturl: params.failedUrl,
    WebHookUrl: params.webHookUrl,
    operation: params.operationType
  });

  if (params.invoiceInfo?.fullName) {
    queryParams.append('FullName', params.invoiceInfo.fullName);
  }
  if (params.invoiceInfo?.email) {
    queryParams.append('Email', params.invoiceInfo.email);
  }
  if (params.invoiceInfo?.phone) {
    queryParams.append('PhoneNumber', params.invoiceInfo.phone);
  }

  return `${params.cardcomUrl}/Interface/LowProfile.aspx?${queryParams.toString()}`;
}
