
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

    // Process request body
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
    
    // Determine operation type and initial amount based on plan type
    let operationType = "ChargeOnly";
    let initialAmount = requestedAmount;
    
    if (planId) {
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
        
      if (planError) {
        await logStep(functionName, "Error fetching plan details", planError, 'error');
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
      
      await logStep(functionName, "Determined payment parameters", { 
        planId, 
        operationType, 
        initialAmount 
      });
    }
    
    // Validate amount
    if (!validateAmount(initialAmount)) {
      await logStep(functionName, "Invalid amount", { initialAmount }, 'error');
      throw new Error("Invalid amount");
    }

    // Create payment session record
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId || null,
        plan_id: planId,
        amount: initialAmount,
        currency: "ILS",
        status: 'initiated',
        operation_type: operationType,
        reference: transactionRef,
        anonymous_data: !userId ? { invoiceInfo, registrationData } : null,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payment_details: { 
          invoiceInfo, 
          redirectUrls,
          isIframePrefill,
          planType: planId
        }
      })
      .select('id')
      .single();
      
    if (sessionError) {
      await logStep(functionName, "Failed to create payment session", sessionError, 'error');
      throw new Error("Failed to create payment session");
    }
    
    const sessionId = sessionData.id;
    await logStep(functionName, "Payment session created", { sessionId, planId, amount: initialAmount });
    
    // Generate LowProfile ID
    const lowProfileId = crypto.randomUUID();
    
    // Update session with lowProfileId
    await supabaseAdmin
      .from('payment_sessions')
      .update({ low_profile_id: lowProfileId })
      .eq('id', sessionId);
      
    await logStep(functionName, "LowProfile ID assigned", { sessionId, lowProfileId });

    // For iFrame prefill mode, return early with session details
    if (isIframePrefill) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment session initialized for iframe",
          data: {
            sessionId: sessionData.id,
            lowProfileId,
            reference: transactionRef,
            terminalNumber,
            cardcomUrl: "https://secure.cardcom.solutions",
            apiName
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build WebHook URL
    let webHookUrl = webhook;
    
    if (!webHookUrl) {
      const baseUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`;
      webHookUrl = `${baseUrl}/cardcom-webhook`;
    }
    
    // Create CardCom URL
    const cardcomUrl = "https://secure.cardcom.solutions";
    const successUrl = redirectUrls?.success || `${req.headers.get('Origin') || ''}/subscription/success`;
    const failedUrl = redirectUrls?.failed || `${req.headers.get('Origin') || ''}/subscription/failed`;
    
    const fullRedirectUrl =
      `${cardcomUrl}/Interface/LowProfile.aspx?terminalnumber=${terminalNumber}` +
      `&lowprofilecode=${lowProfileId}` +
      `&ReturnValue=${transactionRef}` +
      `&sum=${initialAmount}` +
      `&coinid=1` +
      `&language=he` +
      `&successredirecturl=${encodeURIComponent(successUrl)}` +
      `&failureredirecturl=${encodeURIComponent(failedUrl)}` +
      (webHookUrl ? `&WebHookUrl=${encodeURIComponent(webHookUrl)}` : '') +
      `&operation=${operationType}` +
      (invoiceInfo?.fullName ? `&FullName=${encodeURIComponent(invoiceInfo.fullName)}` : '') +
      (invoiceInfo?.email ? `&Email=${encodeURIComponent(invoiceInfo.email)}` : '') +
      (invoiceInfo?.phone ? `&PhoneNumber=${encodeURIComponent(invoiceInfo.phone)}` : '');
      
    await logStep(functionName, "Redirect URL created");
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created successfully",
        data: {
          url: fullRedirectUrl,
          sessionId: sessionData.id,
          lowProfileId,
          reference: transactionRef,
          terminalNumber,
          cardcomUrl
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
