import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function logStep(
  functionName: string,
  step: string, 
  details?: any, 
  level: 'info' | 'warn' | 'error' = 'info',
  supabaseAdmin?: any
) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  const prefix = `[CARDCOM-${functionName.toUpperCase()}][${level.toUpperCase()}][${timestamp}]`;
  
  console.log(`${prefix} ${step}${detailsStr}`);
  
  if (level === 'error' && supabaseAdmin) {
    try {
      await supabaseAdmin.from('system_logs').insert({
        function_name: `cardcom-${functionName}`,
        level,
        message: step,
        details: details || {},
        created_at: timestamp
      });
    } catch (e) {
      console.error('Failed to log to database:', e);
    }
  }
}

function validateAmount(amount: number): boolean {
  return !isNaN(amount) && amount > 0;
}

async function validateTransaction(supabaseAdmin: any, transactionRef: string) {
  const { data: existingTransaction } = await supabaseAdmin
    .from('payment_sessions')
    .select('id, status')
    .eq('reference', transactionRef)
    .limit(1);

  return existingTransaction?.[0] || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'redirect';
    await logStep(functionName, "Function started");
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      planId, 
      amount, 
      operation = "ChargeOnly",
      invoiceInfo, 
      redirectUrls, 
      userId, 
      registrationData,
      isIframePrefill = false
    } = await req.json();

    if (!validateAmount(amount)) {
      await logStep(functionName, "Invalid amount", { amount }, 'error', supabaseAdmin);
      throw new Error("Invalid amount");
    }

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

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId || null,
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

    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    
    if (!terminalNumber || !apiName) {
      await logStep(functionName, "Missing CardCom API configuration", {}, 'error', supabaseAdmin);
      throw new Error("Missing CardCom API configuration");
    }

    if (isIframePrefill) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment session initialized",
          data: {
            sessionId: sessionId,
            reference: transactionRef,
            terminalNumber,
            apiName,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const cardcomUrl = "https://secure.cardcom.solutions";
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
    console.error(`[CARDCOM-REDIRECT][ERROR] ${errorMessage}`);
    
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
