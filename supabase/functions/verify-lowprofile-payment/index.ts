
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Cardcom credentials from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_USERNAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");

    if (!terminalNumber || !apiName) {
      console.error("Missing required Cardcom credentials");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing Cardcom configuration", 
          details: "Please contact support" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse request body
    const { lowProfileId, userId } = await req.json();
    
    // Validate required fields
    if (!lowProfileId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing required fields", 
          details: "LowProfile ID is required" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Verifying payment for LowProfile ID:", lowProfileId);

    // Prepare request to verify payment status
    const payload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      LowProfileId: lowProfileId
    };

    // Call Cardcom API to verify the payment
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cardcom API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Failed to verify payment", 
          details: errorText 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse the API response
    const result = await response.json();
    console.log("Payment verification result:", result);

    // Check if the payment was successful
    const isSuccessful = result.OperationResponse === "0";
    
    // Extract payment details
    const paymentDetails = {
      transactionId: result.TranzactionId || null,
      token: result.TokenInfo?.Token || null,
      cardLastDigits: result.TranzactionInfo?.Last4CardDigitsString || null,
      cardExpiry: result.TokenInfo?.CardYear && result.TokenInfo?.CardMonth ? 
        `${result.TokenInfo.CardMonth}/${result.TokenInfo.CardYear}` : null,
      cardOwnerName: result.UIValues?.CardOwnerName || null,
      cardOwnerEmail: result.UIValues?.CardOwnerEmail || null,
      cardOwnerPhone: result.UIValues?.CardOwnerPhone || null,
      amount: result.TranzactionInfo?.Amount || 0,
      currency: result.TranzactionInfo?.CoinId === 1 ? "ILS" : "USD",
      approvalNumber: result.TranzactionInfo?.ApprovalNumber || null
    };

    // Log the transaction in the database if user ID is provided
    if (userId && isSuccessful) {
      try {
        const { error: dbError } = await supabase
          .from('user_payment_logs')
          .insert({
            user_id: userId,
            token: paymentDetails.token || lowProfileId,
            amount: paymentDetails.amount || 0,
            approval_code: paymentDetails.approvalNumber,
            status: isSuccessful ? "success" : "failed",
            transaction_details: result
          });

        if (dbError) {
          console.error("Error logging transaction to database:", dbError);
        }
      } catch (dbError) {
        console.error("Exception logging transaction to database:", dbError);
      }
    }

    // Extract token information if available
    const tokenInfo = result.TokenInfo ? {
      token: result.TokenInfo.Token,
      lastFourDigits: result.TranzactionInfo?.Last4CardDigitsString || "****",
      expiryMonth: result.TokenInfo.CardMonth ? parseInt(result.TokenInfo.CardMonth, 10) : 0,
      expiryYear: result.TokenInfo.CardYear ? parseInt(result.TokenInfo.CardYear, 10) : 0,
      cardholderName: result.UIValues?.CardOwnerName || ""
    } : null;

    // Return the verification result
    return new Response(
      JSON.stringify({
        success: isSuccessful,
        message: isSuccessful ? "Payment successful" : (result.Description || "Payment failed"),
        paymentDetails,
        tokenInfo,
        rawResponse: result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Internal server error", 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
