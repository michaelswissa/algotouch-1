
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, lowProfileId } = await req.json();

    if (!sessionId && !lowProfileId) {
      throw new Error("Either sessionId or lowProfileId must be provided");
    }

    // Set up Supabase client for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get CardCom API credentials
    const CARDCOM_TERMINAL_NUMBER = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const CARDCOM_API_NAME = Deno.env.get("CARDCOM_API_NAME");
    
    if (!CARDCOM_TERMINAL_NUMBER || !CARDCOM_API_NAME) {
      throw new Error("Missing CardCom configuration");
    }

    if (sessionId) {
      // Check payment session status directly in our database
      const { data: sessionData, error: sessionError } = await supabase
        .from("payment_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionError) {
        throw new Error(`Error retrieving payment session: ${sessionError.message}`);
      }

      if (!sessionData) {
        throw new Error("Payment session not found");
      }

      // If we already know the status is completed or failed, return immediately
      if (sessionData.payment_details?.status === "completed") {
        return new Response(
          JSON.stringify({
            success: true,
            status: "completed",
            paymentDetails: sessionData.payment_details
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (sessionData.payment_details?.status === "failed") {
        return new Response(
          JSON.stringify({
            success: false,
            status: "failed",
            error: sessionData.payment_details?.failure_reason || "Payment failed"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If we have a lowProfileId stored, use it to check with CardCom
      lowProfileId = sessionData.payment_details?.lowProfileId;
    }

    if (!lowProfileId) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "pending",
          message: "Payment is still processing"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check with CardCom API
    const apiUrl = "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx";
    const params = new URLSearchParams({
      terminalnumber: CARDCOM_TERMINAL_NUMBER,
      username: CARDCOM_API_NAME,
      lowprofilecode: lowProfileId,
      codepage: "65001"
    });

    console.log("Checking status with CardCom:", params.toString());
    
    const response = await fetch(`${apiUrl}?${params.toString()}`);
    const responseText = await response.text();
    
    // Parse response text into an object
    const responseParams = responseText.split('&').reduce((acc: Record<string, string>, param) => {
      const [key, value] = param.split('=');
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {});

    console.log("CardCom status response:", responseParams);

    const operationResponse = responseParams.OperationResponse;
    const isSuccess = operationResponse === "0";
    
    return new Response(
      JSON.stringify({
        success: isSuccess,
        status: isSuccess ? "completed" : "failed",
        lowProfileCode: responseParams.LowProfileCode,
        dealResponse: responseParams.DealResponse,
        message: isSuccess ? "Payment completed successfully" : "Payment failed or pending",
        cardToken: responseParams.Token,
        tokenExDate: responseParams.TokenExDate,
        rawResponse: responseParams
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error checking payment status:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "An error occurred checking payment status",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
