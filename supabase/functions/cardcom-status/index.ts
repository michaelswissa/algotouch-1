
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
    
    logStep("Received request", { lowProfileCode });

    if (!lowProfileCode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required lowProfileCode parameter",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create CardCom API request body
    const statusPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      LowProfileId: lowProfileCode
    };
    
    logStep("Sending request to CardCom");
    
    // Get transaction status from CardCom
    const response = await fetch(CARDCOM_CONFIG.endpoints.getLowProfileResult, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(statusPayload),
    });
    
    const responseData = await response.json();
    
    logStep("CardCom response", responseData);
    
    if (responseData.ResponseCode !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "Failed to retrieve transaction status",
          responseCode: responseData.ResponseCode
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Check if transaction was successful (ResponseCode 0)
    const transactionInfo = responseData.TranzactionInfo || {};
    const isTransactionSuccess = 
      transactionInfo.ResponseCode === 0 || 
      transactionInfo.ResponseCode === 700 || 
      transactionInfo.ResponseCode === 701;
    
    // If we have transaction info but it failed, return specific error
    if (transactionInfo.ResponseCode && !isTransactionSuccess) {
      return new Response(
        JSON.stringify({
          success: false,
          message: transactionInfo.Description || "Transaction was declined",
          responseCode: transactionInfo.ResponseCode,
          transactionId: transactionInfo.TranzactionId?.toString(),
          status: 'declined'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Extract key information from the response
    const transactionId = transactionInfo.TranzactionId?.toString();
    const status = isTransactionSuccess ? 'approved' : 'unknown';
    const cardInfo = {
      last4Digits: transactionInfo.Last4CardDigits?.toString(),
      cardType: transactionInfo.CardInfo,
      cardOwnerName: transactionInfo.CardOwnerName,
      cardOwnerEmail: transactionInfo.CardOwnerEmail,
      cardOwnerPhone: transactionInfo.CardOwnerPhone,
      token: responseData.TokenInfo?.Token
    };
    
    // Update payment session in database
    try {
      // Get the payment session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .select('id, user_id')
        .eq('low_profile_code', lowProfileCode)
        .single();
        
      if (sessionError) {
        logStep("Error retrieving payment session", { error: sessionError });
      } else if (session) {
        // Update the session with transaction details
        const { error: updateError } = await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: status,
            transaction_id: transactionId,
            payment_details: {
              ...cardInfo,
              approvalNumber: transactionInfo.ApprovalNumber,
              documentNumber: transactionInfo.DocumentNumber,
              documentUrl: transactionInfo.DocumentUrl
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
          
        if (updateError) {
          logStep("Error updating payment session", { error: updateError });
        } else {
          logStep("Payment session updated successfully");
        }
        
        // If transaction was successful, log it separately
        if (isTransactionSuccess && session.user_id) {
          const paymentLogData = {
            user_id: session.user_id,
            plan_id: responseData.ReturnValue?.split('-')[0] || 'unknown',
            amount: transactionInfo.Amount,
            currency: transactionInfo.CoinId === 1 ? 'ILS' : (transactionInfo.CoinId === 2 ? 'USD' : 'unknown'),
            transaction_id: transactionId,
            payment_status: 'completed',
            payment_data: {
              cardInfo: cardInfo,
              documentInfo: transactionInfo.DocumentNumber ? {
                documentNumber: transactionInfo.DocumentNumber,
                documentType: transactionInfo.DocumentType,
                documentUrl: transactionInfo.DocumentUrl
              } : null,
              approvalNumber: transactionInfo.ApprovalNumber,
              token: responseData.TokenInfo?.Token
            }
          };
          
          const { error: logError } = await supabaseAdmin
            .from('payment_logs')
            .insert(paymentLogData);
            
          if (logError) {
            logStep("Error logging payment", { error: logError });
          } else {
            logStep("Payment logged successfully");
          }
        }
      }
    } catch (dbError) {
      logStep("Exception updating database", { error: dbError });
      // Don't fail the request if DB update fails
    }
    
    return new Response(
      JSON.stringify({
        success: isTransactionSuccess,
        message: isTransactionSuccess 
          ? "Transaction completed successfully" 
          : (transactionInfo.Description || "Transaction status unknown"),
        transactionId: transactionId,
        status: status,
        cardInfo: cardInfo,
        documentInfo: transactionInfo.DocumentNumber ? {
          documentNumber: transactionInfo.DocumentNumber,
          documentType: transactionInfo.DocumentType,
          documentUrl: transactionInfo.DocumentUrl
        } : null,
        tokenInfo: responseData.TokenInfo || null,
        rawResponse: responseData
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
        message: errorMessage || "Failed to check payment status",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
