import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, logStep, validateLowProfileId } from "../cardcom-utils/index.ts";

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
    await logStep('status', "ERROR", { message: errorMessage }, 'error', supabaseAdmin);
    
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
