
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logStep, validateAmount, validateTransaction } from "../_shared/cardcom_utils.ts";

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'payment';
    await logStep(functionName, "Function started");
    
    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Get CardCom configuration from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    
    if (!terminalNumber || !apiName) {
      await logStep(functionName, "Missing CardCom API configuration", {}, 'error', supabaseAdmin);
      throw new Error("Missing CardCom API configuration");
    }

    // Process the request body
    const { 
      planId, 
      amount: requestedAmount, 
      operation = "ChargeOnly",
      invoiceInfo, 
      redirectUrls, 
      userId, 
      registrationData,
      isIframePrefill = false,
      webhook = null
    } = await req.json();
    
    // Generate a unique reference for this transaction
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // If a plan ID is provided, fetch the plan details from the database
    let amount = requestedAmount;
    let planDetails = null;
    
    if (planId) {
      try {
        const { data: fetchedPlan, error: planError } = await supabaseAdmin
          .from('plans')
          .select('*')
          .eq('id', planId)
          .maybeSingle();
        
        if (planError) {
          await logStep(functionName, "Error fetching plan details", planError, 'error', supabaseAdmin);
        } else if (fetchedPlan) {
          planDetails = fetchedPlan;
          
          // If amount is not explicitly provided, use the plan price
          if (!requestedAmount && fetchedPlan.price) {
            amount = fetchedPlan.price;
          }
        }
      } catch (error) {
        await logStep(functionName, "Exception fetching plan details", error, 'error', supabaseAdmin);
      }
    }
    
    // Validate the amount
    if (!validateAmount(amount)) {
      await logStep(functionName, "Invalid amount", { amount }, 'error', supabaseAdmin);
      throw new Error("Invalid amount");
    }
    
    // Check for duplicate transactions
    const existingTransaction = await validateTransaction(supabaseAdmin, transactionRef);
    if (existingTransaction) {
      await logStep(functionName, "Duplicate transaction reference detected", {
        reference: transactionRef,
        existingId: existingTransaction.id,
        existingStatus: existingTransaction.status
      }, 'warn', supabaseAdmin);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Using existing payment session",
          data: {
            sessionId: existingTransaction.id,
            status: existingTransaction.status,
            isDuplicate: true
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a payment session record
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId || null,
        plan_id: planId,
        amount: amount,
        currency: "ILS",
        status: 'initiated',
        operation_type: operation,
        reference: transactionRef,
        anonymous_data: !userId ? { invoiceInfo, registrationData } : null,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes expiry
        payment_details: { 
          invoiceInfo, 
          redirectUrls,
          isIframePrefill
        }
      })
      .select('id')
      .single();
      
    if (sessionError) {
      await logStep(functionName, "Failed to create payment session", { error: sessionError.message }, 'error', supabaseAdmin);
      throw new Error("Failed to create payment session");
    }
    
    const sessionId = sessionData.id;
    await logStep(functionName, "Payment session created", { sessionId, planId, amount });
    
    // Generate LowProfile ID using a deterministic algorithm
    const lowProfileId = crypto.randomUUID();
    
    // Update the session with the lowProfileId
    await supabaseAdmin
      .from('payment_sessions')
      .update({
        low_profile_id: lowProfileId
      })
      .eq('id', sessionId);
      
    await logStep(functionName, "LowProfile ID assigned", { sessionId, lowProfileId });
    
    // For iFrame prefill mode, return early with session details
    if (isIframePrefill) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment session initialized for iframe",
          data: {
            sessionId,
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
    
    // Build WebHook URL for Cardcom callbacks
    let webHookUrl = webhook;
    
    if (!webHookUrl) {
      const baseUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`;
      webHookUrl = `${baseUrl}/cardcom-webhook`;
    }
    
    // Create the Cardcom LowProfile URL
    const cardcomUrl = "https://secure.cardcom.solutions";
    const successUrl = redirectUrls?.success || `${req.headers.get('Origin') || ''}/subscription/success`;
    const failedUrl = redirectUrls?.failed || `${req.headers.get('Origin') || ''}/subscription/failed`;
    
    const fullRedirectUrl =
      `${cardcomUrl}/Interface/LowProfile.aspx?terminalnumber=${terminalNumber}` +
      `&lowprofilecode=${lowProfileId}` +
      `&ReturnValue=${transactionRef}` +
      `&sum=${amount}` +
      `&coinid=1` +
      `&language=he` +
      `&successredirecturl=${encodeURIComponent(successUrl)}` +
      `&failureredirecturl=${encodeURIComponent(failedUrl)}` +
      (webHookUrl ? `&WebHookUrl=${encodeURIComponent(webHookUrl)}` : '') +
      `&operation=${operation === "ChargeAndCreateToken" ? "ChargeAndCreateToken" : "ChargeOnly"}` +
      (invoiceInfo?.fullName ? `&FullName=${encodeURIComponent(invoiceInfo.fullName)}` : '') +
      (invoiceInfo?.email ? `&Email=${encodeURIComponent(invoiceInfo.email)}` : '') +
      (invoiceInfo?.phone ? `&PhoneNumber=${encodeURIComponent(invoiceInfo.phone)}` : '');
      
    await logStep(functionName, "Redirect URL created", { url: fullRedirectUrl });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created successfully",
        data: {
          url: fullRedirectUrl,
          sessionId,
          lowProfileId,
          reference: transactionRef,
          terminalNumber,
          cardcomUrl
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CARDCOM-PAYMENT][ERROR] ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
