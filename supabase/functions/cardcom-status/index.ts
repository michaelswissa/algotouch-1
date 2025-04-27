
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Include utility functions directly in this file to avoid import issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Log a step in the function execution with optional details
 */
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
  
  // Store critical logs in database
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
      // Don't let logging errors affect main flow
      console.error('Failed to log to database:', e);
    }
  }
}

/**
 * Validate if a string is a valid UUID for LowProfileId
 */
function validateLowProfileId(lowProfileId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lowProfileId);
}

const CARDCOM_CONFIG = {
  terminalNumber: Deno.env.get("CARDCOM_TERMINAL_NUMBER") || '',
  apiName: Deno.env.get("CARDCOM_API_NAME") || '',
  endpoints: {
    getLowProfileResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'status';
    await logStep(functionName, "Function started");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { lowProfileId } = await req.json();
    
    if (!lowProfileId || !validateLowProfileId(lowProfileId)) {
      await logStep(functionName, "Invalid lowProfileId format", { lowProfileId }, 'error', supabaseAdmin);
      throw new Error("Invalid lowProfileId format");
    }

    await logStep(functionName, "Checking payment status", { lowProfileId });
    
    if (!CARDCOM_CONFIG.terminalNumber || !CARDCOM_CONFIG.apiName) {
      throw new Error("Missing CardCom configuration");
    }
    
    const { data: existingPayment } = await supabaseAdmin
      .rpc('check_duplicate_payment_extended', { low_profile_id: lowProfileId });
    
    if (existingPayment?.exists) {
      await logStep(functionName, "Payment already processed", existingPayment);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          data: existingPayment
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!CARDCOM_CONFIG.terminalNumber || !CARDCOM_CONFIG.apiName) {
      throw new Error("Missing CardCom configuration");
    }
    
    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      LowProfileId: lowProfileId
    };
    
    await logStep(functionName, "Sending status request to CardCom", { 
      terminalNumber: CARDCOM_CONFIG.terminalNumber,
      lowProfileId
    });
    
    const response = await fetch(CARDCOM_CONFIG.endpoints.getLowProfileResult, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardcomPayload),
    });
    
    const responseData = await response.json();
    await logStep(functionName, "CardCom payment status response", responseData);
    
    if (responseData.ResponseCode !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "Failed to get payment status",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const successful = responseData.TranzactionInfo && 
                      (responseData.TranzactionInfo.ResponseCode === 0 || 
                       responseData.TranzactionInfo.ResponseCode === '0');
    
    await logStep(functionName, "Payment status check complete", { 
      successful,
      responseCode: responseData.TranzactionInfo?.ResponseCode
    });
    
    if (successful) {
      try {
        const { data: paymentSession } = await supabaseAdmin
          .from('payment_sessions')
          .select('user_id, reference, plan_id')
          .eq('low_profile_code', lowProfileId)
          .single();
        
        if (paymentSession?.user_id) {
          await logStep(functionName, "Found payment session", {
            userId: paymentSession.user_id,
            reference: paymentSession.reference,
            planId: paymentSession.plan_id
          });
          
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: responseData.TranzactionInfo.TranzactionId,
              payment_details: responseData
            })
            .eq('low_profile_code', lowProfileId);
            
          await supabaseAdmin
            .from('user_payment_logs')
            .insert({
              user_id: paymentSession.user_id,
              token: lowProfileId,
              transaction_id: responseData.TranzactionInfo.TranzactionId,
              amount: responseData.TranzactionInfo.Amount,
              status: 'payment_success',
              payment_data: responseData
            });
          
          await logStep(functionName, "Updated payment records", { userId: paymentSession.user_id });
        } else {
          await logStep(functionName, "No payment session found for this low profile code");
        }
      } catch (dbError) {
        await logStep(functionName, "Error updating payment records", { error: dbError.message });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: successful,
        message: successful ? "Payment successful" : "Payment failed or pending",
        data: responseData
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CARDCOM-STATUS][ERROR] ${errorMessage}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
