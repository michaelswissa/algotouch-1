
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
const cardcomUrl = "https://secure.cardcom.solutions";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Parse request payload
    const { lowProfileCode, sessionId } = await req.json();
    
    if (!lowProfileCode) {
      throw new Error("Missing required parameter: lowProfileCode");
    }
    
    // Validate session belongs to user
    if (sessionId) {
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('payment_sessions')
        .select('id, user_id, status')
        .eq('id', sessionId)
        .single();
        
      if (sessionError || !sessionData) {
        throw new Error("Payment session not found");
      }
      
      if (sessionData.user_id !== user.id) {
        throw new Error("Unauthorized access to payment session");
      }
    }
    
    // Query CardCom API for transaction status
    const queryParams = new URLSearchParams({
      terminalnumber: terminalNumber,
      username: apiName,
      lowprofilecode: lowProfileCode
    });
    
    const response = await fetch(
      `${cardcomUrl}/Interface/BillGoldGetLowProfileIndicator.aspx?${queryParams.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`CardCom API error: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);
    
    const operationResponse = responseParams.get("OperationResponse") || "";
    const isSuccessful = operationResponse === "0";
    
    // Update session status if session ID is provided
    if (sessionId) {
      const status = isSuccessful ? 'completed' : 'failed';
      const transactionId = responseParams.get("InternalDealNumber");
      
      const { error: updateError } = await supabaseClient
        .from('payment_sessions')
        .update({
          status,
          transaction_id: transactionId,
          transaction_data: Object.fromEntries(responseParams.entries())
        })
        .eq('id', sessionId);
        
      if (updateError) {
        console.error("Failed to update session status:", updateError);
      }
    }
    
    // Return payment status
    return new Response(
      JSON.stringify({
        success: isSuccessful,
        status: isSuccessful ? 'completed' : 'failed',
        message: isSuccessful 
          ? "Payment completed successfully" 
          : `Payment failed: ${responseParams.get("Description") || "Unknown error"}`,
        data: {
          transactionId: responseParams.get("InternalDealNumber") || null,
          responseCode: operationResponse
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error("Error in cardcom-status function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Payment status check failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
