import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration with validation
const CARDCOM_CONFIG = {
  terminalNumber: Deno.env.get("CARDCOM_TERMINAL_NUMBER") || '',
  apiName: Deno.env.get("CARDCOM_API_NAME") || '',
  endpoints: {
    getLowProfileResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult"
  }
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Create Supabase admin client for database operations that bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract low profile ID from request body
    const { lowProfileId } = await req.json();
    
    if (!lowProfileId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing lowProfileId parameter",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    logStep("Checking payment status", { lowProfileId });
    
    // Validate configuration
    if (!CARDCOM_CONFIG.terminalNumber || !CARDCOM_CONFIG.apiName) {
      throw new Error("Missing CardCom configuration");
    }
    
    // First, check our database to see if we've already processed this transaction
    const { data: existingPayment } = await supabaseAdmin
      .rpc('check_duplicate_payment_extended', { low_profile_id: lowProfileId });
    
    if (existingPayment?.exists) {
      logStep("Payment already processed", existingPayment);
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
    
    // Otherwise, check with CardCom API using v11 endpoint
    if (!CARDCOM_CONFIG.terminalNumber || !CARDCOM_CONFIG.apiName) {
      throw new Error("Missing CardCom configuration");
    }
    
    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      LowProfileId: lowProfileId
    };
    
    logStep("Sending status request to CardCom", { 
      terminalNumber: CARDCOM_CONFIG.terminalNumber,
      lowProfileId
    });
    
    const response = await fetch(CARDCOM_CONFIG.endpoints.getLowProfileResult, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardcomPayload),
    });
    
    const responseData = await response.json();
    logStep("CardCom payment status response", responseData);
    
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

    // Check for transaction info to determine if payment was successful
    const successful = responseData.TranzactionInfo && 
                      (responseData.TranzactionInfo.ResponseCode === 0 || 
                       responseData.TranzactionInfo.ResponseCode === '0');
    
    logStep("Payment status check complete", { 
      successful,
      responseCode: responseData.TranzactionInfo?.ResponseCode
    });
    
    // If payment is successful, update any related user records
    if (successful) {
      try {
        // Find the payment session to get the user ID
        const { data: paymentSession } = await supabaseAdmin
          .from('payment_sessions')
          .select('user_id, reference, plan_id')
          .eq('low_profile_code', lowProfileId)
          .single();
        
        if (paymentSession?.user_id) {
          logStep("Found payment session", {
            userId: paymentSession.user_id,
            reference: paymentSession.reference,
            planId: paymentSession.plan_id
          });
          
          // Update payment session status
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: responseData.TranzactionInfo.TranzactionId,
              payment_details: responseData
            })
            .eq('low_profile_code', lowProfileId);
            
          // Record successful payment
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
          
          logStep("Updated payment records", { userId: paymentSession.user_id });
        } else {
          logStep("No payment session found for this low profile code");
        }
      } catch (dbError) {
        logStep("Error updating payment records", { error: dbError.message });
        // Continue despite DB error to allow client to proceed
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
    logStep("ERROR", { message: errorMessage });
    
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
