
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logStep, validateLowProfileId } from "../_shared/cardcom_utils.ts";

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'submit';
    await logStep(functionName, "Function started");

    // Create Supabase admin client for database operations that bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      lowProfileCode,
      terminalNumber,
      operation = "ChargeOnly",
      cardOwnerDetails
    } = await req.json();
    
    if (!lowProfileCode || !validateLowProfileId(lowProfileCode)) {
      await logStep(functionName, "Invalid lowProfileId format", { lowProfileCode }, 'error', supabaseAdmin);
      throw new Error("Invalid lowProfileId format");
    }

    logStep(functionName, "Received request data", {
      lowProfileCode,
      terminalNumber,
      operation,
      hasCardOwnerDetails: !!cardOwnerDetails
    });

    if (!lowProfileCode || !terminalNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate card owner details
    if (!cardOwnerDetails ||
        !cardOwnerDetails.cardOwnerName ||
        !cardOwnerDetails.cardOwnerEmail || 
        !cardOwnerDetails.cardOwnerPhone) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required card owner details",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get CardCom API configuration from environment variables
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    
    if (!apiName) {
      throw new Error("Missing CardCom API Name in environment variables");
    }

    // Find the payment session
    const { data: paymentSession, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_id', lowProfileCode)
      .single();
      
    if (sessionError || !paymentSession) {
      logStep(functionName, "Payment session not found", { error: sessionError?.message });
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment session not found",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    logStep(functionName, "Found payment session", { sessionId: paymentSession.id });
    
    // Now make an API call to CardCom to process the transaction using the LowProfile code
    const cardcomApiUrl = "https://secure.cardcom.solutions/api/v11/Transactions/TransactionByLowProfileCode";
    
    const cardcomPayload = {
      TerminalNumber: terminalNumber,
      APIName: apiName,
      APIPassword: apiPassword,
      LowProfileCode: lowProfileCode,
      CardOwnerName: cardOwnerDetails.cardOwnerName,
      CardOwnerEmail: cardOwnerDetails.cardOwnerEmail,
      CardOwnerPhone: cardOwnerDetails.cardOwnerPhone,
      CardOwnerId: cardOwnerDetails.cardOwnerId || "",
      CallbackUrl: paymentSession.webhook_url || null,
      ExternalUniqTranId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
    
    try {
      logStep(functionName, "Sending transaction request to CardCom", { 
        url: cardcomApiUrl,
        lowProfileCode,
        terminalNumber 
      });
      
      const response = await fetch(cardcomApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cardcomPayload),
      });
      
      const cardcomResponse = await response.json();
      
      logStep(functionName, "Received response from CardCom", cardcomResponse);
      
      // Update payment session status based on CardCom response
      const isSuccess = cardcomResponse.ResponseCode === 0 || cardcomResponse.ResponseCode === "0";
      const newStatus = isSuccess ? 'completed' : 'failed';
      
      await supabaseAdmin
        .from('payment_sessions')
        .update({
          status: newStatus,
          transaction_id: cardcomResponse.TransactionId || null,
          transaction_data: cardcomResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentSession.id);
      
      logStep(functionName, `Payment ${isSuccess ? 'succeeded' : 'failed'}`, {
        lowProfileCode,
        sessionId: paymentSession.id,
        transactionId: cardcomResponse.TransactionId,
        responseCode: cardcomResponse.ResponseCode
      });
      
      const responseData = {
        success: isSuccess,
        message: isSuccess ? "Payment processed successfully" : cardcomResponse.Description || "Payment processing failed",
        data: {
          ...cardcomResponse,
          status: newStatus,
          sessionId: paymentSession.id,
          lowProfileCode
        }
      };

      return new Response(
        JSON.stringify(responseData),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[CARDCOM-SUBMIT][ERROR] ${errorMessage}`);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CARDCOM-SUBMIT][ERROR] ${errorMessage}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
