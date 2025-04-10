
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Cardcom credentials from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_USER");
    const projectDomain = Deno.env.get("PROJECT_DOMAIN") || "https://algotouch.lovable.app";

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
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set default values if not provided
    const amount = requestData.amount || 100; // 1 ILS
    const returnUrl = requestData.returnUrl || `${projectDomain}/payment/token-received`;
    const cancelUrl = requestData.cancelUrl || `${projectDomain}/payment/token-received?status=fail`;
    const language = requestData.language || "he"; // Hebrew
    const productName = requestData.productName || "AlgoTouch Payment";
    const customerId = requestData.customerId || crypto.randomUUID();
    
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
      ReturnValue: customerId, // Unique ID for tracking this transaction
      SendTokenInRedirect: "1", // This ensures the token is included in the redirect
    };

    // Add customer information if provided
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
          status: response.status, 
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
    return new Response(
      JSON.stringify({
        lowProfileUrl: cardcomResponse.Url,
        lowProfileId: cardcomResponse.LowProfileId
      }),
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
