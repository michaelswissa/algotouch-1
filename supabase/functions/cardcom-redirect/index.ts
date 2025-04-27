import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, logStep, validateAmount, validateTransaction } from "../cardcom-utils/index.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'redirect';
    await logStep(functionName, "Function started");
    
    // Create Supabase clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Create admin client for database operations that bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { planId, amount, operation = "ChargeOnly", invoiceInfo, redirectUrls, userId, registrationData } = await req.json();

    // Validate inputs
    if (!validateAmount(amount)) {
      await logStep(functionName, "Invalid amount", { amount }, 'error', supabaseAdmin);
      throw new Error("Invalid amount");
    }

    // Check for duplicate transaction
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Store payment session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId || user?.id || null,
        plan_id: planId,
        amount: amount,
        currency: "ILS",
        status: 'pending',
        operation_type: operation,
        invoice_info: invoiceInfo,
        redirect_urls: redirectUrls,
        reference: transactionRef,
        registration_data: registrationData
      })
      .select('id')
      .single();

    if (sessionError) {
      await logStep(functionName, "Failed to create payment session", { error: sessionError.message }, 'error', supabaseAdmin);
      throw new Error("Failed to create payment session");
    }

    const sessionId = sessionData.id;
    await logStep(functionName, "Payment session created", { sessionId });

    // Get CardCom API configuration from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    const cardcomUrl = "https://secure.cardcom.solutions";

    if (!terminalNumber || !apiName || !apiPassword) {
      await logStep(functionName, "Missing CardCom API configuration", {}, 'error', supabaseAdmin);
      throw new Error("Missing CardCom API configuration in environment variables");
    }

    // Construct the URL for redirection
    const fullRedirectUrl =
      `${cardcomUrl}/BillGoldLowProfile.aspx?terminalnumber=${terminalNumber}` +
      `&total=${amount}` +
      `&LPCreditCards=${operation === "ChargeAndCreateToken" ? 1 : 0}` +
      `&OperationType=${operation === "ChargeAndCreateToken" ? 1 : 0}` +
      `&UTF8=1` +
      `&CoinID=1` +
      `&ValidUntil=30` +
      `&ReturnValue=${transactionRef}` +
      `&SuccessUrl=${redirectUrls.success}` +
      `&FailureUrl=${redirectUrls.failed}`;

    await logStep(functionName, "Redirect URL created", { url: fullRedirectUrl });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment redirection URL created",
        data: {
          url: fullRedirectUrl,
          sessionId: sessionId,
          reference: transactionRef
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logStep('redirect', "ERROR", { message: errorMessage }, 'error', supabaseAdmin);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
