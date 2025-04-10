
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LowProfileRequest {
  amount?: number;
  returnUrl?: string;
  cancelUrl?: string;
  language?: string;
  productName?: string;
  customerId?: string;
  email?: string;
  phone?: string;
  fullName?: string;
}

interface LowProfileResponse {
  lowProfileUrl?: string;
  lowProfileId?: string;
  error?: string;
  details?: any;
}

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
    let requestData: LowProfileRequest = {};
    try {
      requestData = await req.json();
    } catch (e) {
      console.warn("Failed to parse request body, using defaults");
    }

    // Set default values if not provided
    const amount = requestData.amount || 100; // 1 ILS
    const returnUrl = requestData.returnUrl || "https://example.com/success";
    const cancelUrl = requestData.cancelUrl || "https://example.com/cancel";
    const language = requestData.language || "he"; // Hebrew
    const productName = requestData.productName || "Test Payment";

    // Determine origin for postMessage
    const origin = new URL(returnUrl).origin;
    
    // Create the request payload for Cardcom LowProfile API
    const payload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      Operation: "1", // ChargeOnly
      Amount: amount,
      SuccessRedirectUrl: returnUrl,
      FailedRedirectUrl: cancelUrl,
      WebHookUrl: returnUrl, // This should be a server endpoint in production
      Language: language,
      ProductName: productName,
      APILevel: "10",
      ISOCoinId: "1", // ILS
      ReturnValue: new Date().getTime().toString(), // Unique ID for this transaction
    };

    if (requestData.email) {
      payload.CardOwnerEmail = requestData.email;
      payload.ShowCardOwnerEmail = "true";
      payload.ReqCardOwnerEmail = "true";
    }

    if (requestData.fullName) {
      payload.CardOwnerName = requestData.fullName;
    }

    if (requestData.phone) {
      payload.CardOwnerPhone = requestData.phone;
      payload.ShowCardOwnerPhone = "true";
    }

    // Add configuration to inject a postMessage script to the LowProfile page
    payload.CSSUrl = `https://example.com/cardcom-bridge.js?origin=${encodeURIComponent(origin)}`;

    console.log("Sending LowProfile request:", payload);

    // Call Cardcom API to create a LowProfile deal
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cardcom API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create payment session", 
          details: errorText 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse the API response
    const cardcomResponse = await response.json();
    console.log("Cardcom API response:", cardcomResponse);

    if (cardcomResponse.ResponseCode !== 0) {
      return new Response(
        JSON.stringify({ 
          error: cardcomResponse.Description || "Error creating payment session", 
          details: cardcomResponse 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Return the LowProfile URL and ID
    const result: LowProfileResponse = {
      lowProfileUrl: cardcomResponse.Url,
      lowProfileId: cardcomResponse.LowProfileId
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error creating LowProfile deal:", error);
    return new Response(
      JSON.stringify({ 
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
