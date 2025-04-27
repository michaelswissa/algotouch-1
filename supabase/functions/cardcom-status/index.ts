
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration
const CARDCOM_CONFIG = {
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    getLowProfileResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLowProfileResult"
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
    
    const { lowProfileCode } = await req.json();
    
    logStep("Received request data", { lowProfileCode });

    if (!lowProfileCode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing lowProfileCode parameter",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if we already have payment session stored
    let paymentSession = null;
    let paymentStatus = 'unknown';
    
    try {
      const { data: session, error } = await supabaseAdmin
        .from('payment_sessions')
        .select('*')
        .eq('low_profile_code', lowProfileCode)
        .single();
      
      if (!error && session) {
        paymentSession = session;
        paymentStatus = session.status;
        
        // If payment is already verified as completed, return immediately
        if (session.status === 'completed') {
          logStep("Payment already completed (cached)", { 
            sessionId: session.id,
            status: session.status,
            transactionId: session.transaction_id
          });
          
          return new Response(
            JSON.stringify({
              success: true,
              message: "Payment status retrieved from cache",
              status: session.status,
              transactionId: session.transaction_id,
              transactionData: session.transaction_data
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    } catch (dbError) {
      logStep("Error checking session cache", { error: dbError.message });
      // Continue with verification despite DB error
    }
    
    // Query CardCom API for payment status
    logStep("Querying CardCom for payment status");
    
    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      LowProfileId: lowProfileCode
    };
    
    // Make request to CardCom API to get low profile status
    const response = await fetch(CARDCOM_CONFIG.endpoints.getLowProfileResult, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardcomPayload),
    });
    
    const responseData = await response.json();
    logStep("CardCom response", responseData);
    
    // Handle errors from CardCom
    if (responseData.ResponseCode !== 0) {
      // Update payment session status if we have one
      if (paymentSession) {
        try {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'failed',
              error_description: responseData.Description,
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentSession.id);
        } catch (updateError) {
          logStep("Error updating session status", { error: updateError.message });
        }
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "Failed to verify payment status",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Check transaction status from CardCom response
    const transactionInfo = responseData.TranzactionInfo;
    const transactionId = transactionInfo?.TranzactionId;
    const tokenInfo = responseData.TokenInfo;
    
    // Determine if transaction was successful based on TranzactionInfo
    const isSuccessful = !!transactionId && 
      transactionInfo && 
      (transactionInfo.ResponseCode === 0 || 
       transactionInfo.ResponseCode === 700 || 
       transactionInfo.ResponseCode === 701);
    
    // Extract card details if available
    const cardDetails = transactionInfo ? {
      last4CardDigits: transactionInfo.Last4CardDigits,
      cardType: transactionInfo.CardInfo,
      cardExpMonth: transactionInfo.CardMonth,
      cardExpYear: transactionInfo.CardYear,
      cardOwnerName: transactionInfo.CardOwnerName,
      cardOwnerEmail: transactionInfo.CardOwnerEmail,
    } : null;
    
    // Extract token details if available
    const tokenDetails = tokenInfo ? {
      token: tokenInfo.Token,
      tokenExpDate: tokenInfo.TokenExDate,
      approvalNumber: tokenInfo.TokenApprovalNumber
    } : null;
    
    logStep("Payment verification result", { 
      isSuccessful,
      transactionId,
      hasToken: !!tokenDetails
    });
    
    // Update payment session in database
    if (paymentSession) {
      try {
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: isSuccessful ? 'completed' : 'failed',
            transaction_id: transactionId || null,
            updated_at: new Date().toISOString(),
            card_details: cardDetails,
            token_details: tokenDetails,
            transaction_data: transactionInfo || null
          })
          .eq('id', paymentSession.id);
      } catch (updateError) {
        logStep("Error updating payment session", { error: updateError.message });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: isSuccessful,
        message: isSuccessful 
          ? "Payment verified successfully" 
          : "Payment verification failed",
        transactionId: transactionId,
        status: isSuccessful ? 'completed' : 'failed',
        transactionData: transactionInfo,
        tokenData: tokenDetails,
        lowProfileCode,
      }),
      {
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
        message: errorMessage || "Payment status check failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
