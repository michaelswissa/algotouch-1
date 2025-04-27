
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
    
    logStep("Received request for lowProfileCode", { lowProfileCode });

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
    
    // First check if we already know the payment status from our database
    let paymentComplete = false;
    let paymentStatus = null;
    let transactionId = null;
    
    // Check payment_sessions table first
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .single();
      
    if (!sessionError && session) {
      logStep("Found payment session", { status: session.status });
      
      if (session.status === 'completed') {
        paymentComplete = true;
        paymentStatus = 'completed';
        transactionId = session.transaction_id;
      } else if (session.status === 'failed') {
        paymentStatus = 'failed';
      }
    } else {
      // If not found in sessions, check payment logs
      const { data: logs, error: logsError } = await supabaseAdmin
        .from('user_payment_logs')
        .select('*')
        .eq('token', lowProfileCode)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (!logsError && logs && logs.length > 0) {
        logStep("Found payment log", { status: logs[0].status });
        
        if (logs[0].status === 'payment_success' || logs[0].status === 'token_created') {
          paymentComplete = true;
          paymentStatus = 'completed';
          transactionId = logs[0].transaction_id;
        } else if (logs[0].status === 'payment_failed') {
          paymentStatus = 'failed';
        }
      }
    }
    
    // If we already know the payment was successful, return immediately
    if (paymentComplete) {
      logStep("Payment already confirmed as successful");
      return new Response(
        JSON.stringify({
          success: true,
          status: paymentStatus,
          transactionId,
          message: "Payment confirmed successful"
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // If we don't know or payment is still pending, check with CardCom
    logStep("Checking payment status with CardCom API");
    
    // Get the result from CardCom
    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      LowProfileId: lowProfileCode
    };
    
    const response = await fetch(CARDCOM_CONFIG.endpoints.getLowProfileResult, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardcomPayload),
    });
    
    const responseData = await response.json();
    
    logStep("CardCom API response", {
      responseCode: responseData.ResponseCode,
      hasTransaction: !!responseData.TranzactionInfo
    });
    
    // If CardCom returned an error or no transaction found
    if (responseData.ResponseCode !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "Failed to get transaction status",
          status: 'pending'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Extract transaction details
    const trxInfo = responseData.TranzactionInfo;
    if (trxInfo) {
      paymentStatus = trxInfo.ResponseCode === 0 ? 'completed' : 'failed';
      transactionId = trxInfo.TranzactionId;
      
      // If transaction was successful and we have session info, update our database
      if (trxInfo.ResponseCode === 0 && session) {
        try {
          // Update the payment session
          const { error: updateError } = await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: transactionId,
              payment_details: {
                ...session.payment_details,
                transaction_id: transactionId,
                response_code: trxInfo.ResponseCode,
                response_message: trxInfo.Description || '',
                payment_date: new Date().toISOString(),
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);
            
          if (updateError) {
            logStep("Error updating payment session", updateError);
          } else {
            logStep("Payment session updated to completed");
          }
          
          // Create a payment log
          const { error: logError } = await supabaseAdmin
            .from('user_payment_logs')
            .insert({
              user_id: session.user_id,
              subscription_id: null,
              amount: session.amount,
              token: lowProfileCode,
              currency: session.currency,
              status: 'payment_success',
              transaction_id: transactionId,
              payment_data: {
                session_id: session.id,
                plan_id: session.plan_id,
                transaction_info: trxInfo
              }
            });
            
          if (logError) {
            logStep("Error creating payment log", logError);
          } else {
            logStep("Payment log created");
          }
          
          // If this was a token creation, record the token
          if (responseData.TokenInfo && responseData.TokenInfo.Token) {
            const { error: tokenError } = await supabaseAdmin
              .from('recurring_payments')
              .insert({
                user_id: session.user_id,
                token: responseData.TokenInfo.Token,
                token_approval_number: responseData.TokenInfo.TokenApprovalNumber,
                token_expiry: new Date(responseData.TokenInfo.TokenExDate),
                last_4_digits: trxInfo?.Last4CardDigits?.toString(),
                card_type: trxInfo?.CardInfo,
                terminal_number: CARDCOM_CONFIG.terminalNumber,
                status: 'active'
              });
              
            if (tokenError) {
              logStep("Error recording token", tokenError);
            } else {
              logStep("Token recorded successfully", { token: responseData.TokenInfo.Token });
            }
          }
        } catch (dbError) {
          logStep("Database error", dbError);
        }
      }
    }
    
    return new Response(
      JSON.stringify({
        success: paymentStatus === 'completed',
        status: paymentStatus,
        transactionId,
        hasToken: !!responseData.TokenInfo,
        message: paymentStatus === 'completed' 
          ? "Payment confirmed successful"
          : "Payment status checked"
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
        message: errorMessage || "Error checking payment status",
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
