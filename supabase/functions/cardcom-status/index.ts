
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
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
    getLpResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult"
  }
};

// Helper logging function
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
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Parse request parameters
    const { lowProfileCode, sessionId, operationType, planType } = await req.json();
    
    if (!lowProfileCode) {
      throw new Error("Missing LowProfileId parameter");
    }
    
    logStep("Checking payment status", { lowProfileCode, sessionId, operationType, planType });
    
    // First check our database session status
    let sessionStatus = 'pending';
    let paymentDetails = null;
    
    if (sessionId) {
      const { data: session, error } = await supabaseAdmin
        .from('payment_sessions')
        .select('status, transaction_id, payment_details')
        .eq('id', sessionId)
        .single();
      
      if (!error && session) {
        logStep("Session found in database", { status: session.status });
        sessionStatus = session.status;
        paymentDetails = session.payment_details;
        
        // If the session is already marked as completed or failed, just return that status
        if (session.status === 'completed' || session.status === 'failed') {
          return new Response(
            JSON.stringify({
              success: true,
              status: session.status,
              transactionId: session.transaction_id,
              paymentDetails
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } else {
        logStep("Session not found in database", { sessionId, error: error?.message });
      }
    }
    
    // If we don't have a conclusive status from our database, check with CardCom
    const requestBody = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      LowProfileId: lowProfileCode
    };
    
    logStep("Querying CardCom for LP status", requestBody);
    
    const response = await fetch(CARDCOM_CONFIG.endpoints.getLpResult, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    const responseData = await response.json();
    logStep("CardCom response", responseData);
    
    // Process the response
    let status = 'pending';
    let success = false;
    let tokenInfo = null;
    let transactionInfo = null;
    
    if (responseData.ResponseCode === 0) {
      // Check if we have transaction info or token info based on operation
      if (
        (operationType === 'payment' && responseData.TranzactionInfo) ||
        (operationType === 'token_only' && responseData.TokenInfo)
      ) {
        success = true;
        status = 'completed';
        tokenInfo = responseData.TokenInfo;
        transactionInfo = responseData.TranzactionInfo;
        
        logStep("Payment completed successfully", {
          hasToken: !!tokenInfo,
          hasTransaction: !!transactionInfo
        });
        
        // Update session in database if we have sessionId
        if (sessionId) {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: transactionInfo?.TranzactionId?.toString() || null,
              transaction_data: responseData,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
          
          logStep("Updated session status in database", { status: 'completed' });
        }
      } else {
        // We got a success response but no transaction or token - payment may not be completed yet
        status = 'pending';
        logStep("Payment still pending, no transaction or token info yet");
      }
    } else {
      // Non-zero response code means an error
      status = 'failed';
      logStep("Payment failed", { responseCode: responseData.ResponseCode, description: responseData.Description });
      
      // Update session status to failed if we have sessionId
      if (sessionId) {
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: 'failed',
            transaction_data: responseData,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
        
        logStep("Updated session status in database", { status: 'failed' });
      }
    }
    
    // Return the payment status
    return new Response(
      JSON.stringify({
        success: status === 'completed',
        status,
        lowProfileCode,
        cardcomResponse: responseData,
        tokenInfo,
        transactionInfo
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
        message: errorMessage,
        status: 'error'
      }),
      {
        status: 200, // We still want to return 200 for client-side error handling
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
