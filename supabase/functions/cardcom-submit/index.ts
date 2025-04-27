
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
    doTransaction: "https://secure.cardcom.solutions/api/v11/Transaction/DoTransaction",
    getLowProfileResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLowProfileResult"
  }
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-SUBMIT] ${step}${detailsStr}`);
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
    
    const { 
      lowProfileCode,
      terminalNumber,
      operation = "ChargeOnly",
      cardOwnerDetails
    } = await req.json();
    
    logStep("Received request data", { 
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
    
    // First check if this payment has already been processed
    const { data: existingCheck } = await supabaseAdmin.rpc('check_duplicate_payment_extended', {
      low_profile_id: lowProfileCode
    });
    
    if (existingCheck && existingCheck.exists) {
      logStep("Payment already processed", existingCheck);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          data: {
            lowProfileCode,
            transactionId: existingCheck.transaction_id || 'unknown',
            isAlreadyProcessed: true
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the result of the CardCom transaction
    const cardcomPayload = {
      TerminalNumber: terminalNumber || CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      LowProfileId: lowProfileCode
    };
    
    logStep("Checking payment status with CardCom");
    
    const response = await fetch(CARDCOM_CONFIG.endpoints.getLowProfileResult, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardcomPayload),
    });
    
    const responseData = await response.json();
    
    logStep("CardCom payment status response", responseData);
    
    if (responseData.ResponseCode !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "Failed to get transaction result",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Extract the transaction info
    const transactionInfo = responseData.TranzactionInfo;
    const transactionId = transactionInfo?.TranzactionId;
    const responseCode = transactionInfo?.ResponseCode;
    
    // Check if we need to update the payment session
    try {
      // Find the payment session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .select('*')
        .eq('low_profile_code', lowProfileCode)
        .single();
      
      if (sessionError) {
        logStep("Error finding payment session", sessionError);
      } else if (session && session.status !== 'completed') {
        // Update the payment session with the transaction result
        const { error: updateError } = await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: responseCode === 0 ? 'completed' : 'failed',
            transaction_id: transactionId,
            payment_details: {
              ...session.payment_details,
              transaction_id: transactionId,
              response_code: responseCode,
              response_message: transactionInfo?.Description || '',
              payment_date: new Date().toISOString(),
              operation: operation
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
          
        if (updateError) {
          logStep("Error updating payment session", updateError);
        } else {
          logStep("Payment session updated", { id: session.id, status: responseCode === 0 ? 'completed' : 'failed' });
        }
        
        // Record the payment in user_payment_logs
        const { error: logError } = await supabaseAdmin
          .from('user_payment_logs')
          .insert({
            user_id: session.user_id,
            token: lowProfileCode,
            amount: session.amount,
            currency: session.currency,
            status: responseCode === 0 ? 'payment_success' : 'payment_failed',
            transaction_id: transactionId,
            payment_data: {
              session_id: session.id,
              plan_id: session.plan_id,
              response_code: responseCode,
              response_message: transactionInfo?.Description || '',
              operation: operation,
              card_info: transactionInfo ? {
                last4Digits: transactionInfo.Last4CardDigits,
                cardType: transactionInfo.CardInfo,
                cardMonth: transactionInfo.CardMonth,
                cardYear: transactionInfo.CardYear,
                brand: transactionInfo.Brand
              } : null
            }
          });
          
        if (logError) {
          logStep("Error creating payment log", logError);
        } else {
          logStep("Payment log created");
        }
        
        // If this was a token creation, record the token
        if (responseCode === 0 && responseData.TokenInfo && responseData.TokenInfo.Token) {
          const { error: tokenError } = await supabaseAdmin
            .from('recurring_payments')
            .insert({
              user_id: session.user_id,
              token: responseData.TokenInfo.Token,
              token_approval_number: responseData.TokenInfo.TokenApprovalNumber,
              token_expiry: new Date(responseData.TokenInfo.TokenExDate),
              last_4_digits: transactionInfo?.Last4CardDigits?.toString(),
              card_type: transactionInfo?.CardInfo,
              terminal_number: terminalNumber,
              status: 'active'
            });
            
          if (tokenError) {
            logStep("Error recording token", tokenError);
          } else {
            logStep("Token recorded successfully", { token: responseData.TokenInfo.Token });
          }
        }
      }
    } catch (dbError) {
      logStep("Database exception", dbError);
    }
    
    return new Response(
      JSON.stringify({
        success: responseCode === 0,
        message: transactionInfo?.Description || "Transaction processed",
        data: {
          lowProfileCode,
          transactionId,
          responseCode,
          cardInfo: transactionInfo ? {
            last4Digits: transactionInfo.Last4CardDigits,
            cardType: transactionInfo.CardInfo,
            cardMonth: transactionInfo.CardMonth,
            cardYear: transactionInfo.CardYear,
            brand: transactionInfo.Brand
          } : null
        }
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
        message: errorMessage || "Payment processing failed",
      }), {
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
