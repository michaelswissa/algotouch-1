
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logStep } from "../_shared/cardcom_utils.ts";

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'status';
    await logStep(functionName, "Function started");
    
    // Create Supabase admin client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get CardCom API config
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    
    if (!terminalNumber || !apiName) {
      await logStep(functionName, "Missing CardCom API configuration", {}, 'error', supabaseAdmin);
      throw new Error("Missing CardCom API configuration");
    }

    // Parse the request body for lowProfileCode
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      await logStep(functionName, "Failed to parse request body", e, 'error', supabaseAdmin);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid request format",
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { lowProfileCode } = requestData;
    
    if (!lowProfileCode) {
      await logStep(functionName, "Missing lowProfileCode", {}, 'error', supabaseAdmin);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing lowProfileCode parameter",
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    await logStep(functionName, "Checking status for", { lowProfileCode });
    
    // Look up the payment session
    const { data: paymentSession, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_id', lowProfileCode)
      .maybeSingle();
    
    if (sessionError) {
      await logStep(functionName, "Error finding payment session", sessionError, 'error', supabaseAdmin);
      throw new Error("Error finding payment session");
    }
    
    if (!paymentSession) {
      await logStep(functionName, "Payment session not found", { lowProfileCode }, 'error', supabaseAdmin);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment session not found",
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Construct CardCom API URL for getting transaction status
    const cardcomApiUrl = 'https://secure.cardcom.solutions/Interface/LowProfile.aspx';
    const statusUrl = `${cardcomApiUrl}?terminalnumber=${terminalNumber}&lowprofilecode=${lowProfileCode}&operation=GetLowProfileResult&ApiName=${apiName}`;
    
    try {
      await logStep(functionName, "Checking transaction status with CardCom", { lowProfileCode });
      
      // Call CardCom API to get transaction status
      const response = await fetch(statusUrl, { method: 'GET' });
      const cardcomData = await response.json();
      
      await logStep(functionName, "Received status from CardCom", cardcomData);
      
      // Determine payment success from CardCom response
      const isSuccess = cardcomData.ResponseCode === 0 || cardcomData.ResponseCode === "0";
      const status = isSuccess ? 'completed' : 'failed';
      
      // Update the payment session with the latest status
      if (paymentSession.status !== 'completed') {
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status,
            transaction_id: cardcomData.TranzactionId || cardcomData.TransactionId || null,
            transaction_data: cardcomData,
            updated_at: new Date().toISOString()
          })
          .eq('low_profile_id', lowProfileCode);
      }
      
      const responseData = {
        success: isSuccess,
        message: isSuccess ? "Payment completed successfully" : cardcomData.Description || "Payment failed",
        data: {
          ...cardcomData,
          sessionId: paymentSession.id,
          status,
          amount: paymentSession.amount,
          currency: paymentSession.currency
        }
      };
      
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (apiError) {
      // If CardCom API call fails, return the current status from our database
      await logStep(functionName, "CardCom API call failed", { error: apiError.message }, 'error', supabaseAdmin);
      
      const responseData = {
        success: paymentSession.status === 'completed',
        message: "Status based on local data only, CardCom API call failed",
        data: {
          status: paymentSession.status,
          sessionId: paymentSession.id,
          lowProfileId: lowProfileCode,
          error: apiError.message
        }
      };
      
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CARDCOM-STATUS][ERROR] ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
