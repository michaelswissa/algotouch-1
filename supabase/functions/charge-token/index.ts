
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { token, amount, userId, planId } = await req.json();
    
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Processing payment with token:", { tokenPresent: !!token, amount, userId });

    // Get Cardcom credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_USER");
    
    if (!terminalNumber || !apiName) {
      console.error("Missing required Cardcom credentials");
      return new Response(JSON.stringify({ error: "Missing Cardcom configuration" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create a unique transaction ID to prevent duplicates
    const externalUniqTranId = crypto.randomUUID();

    // Create the request payload for Cardcom ChargeToken API
    const payload = {
      TerminalNumber: terminalNumber,
      UserName: apiName,
      TokenToCharge: {
        Token: token,
        SumToBill: amount || 100, // Default to 100 (1 NIS) if no amount provided
        UniqAsmachta: externalUniqTranId,
        ApiLevel: "10",
        CardOwnerName: "", // Can be filled with user name if available
      }
    };

    console.log("Sending ChargeToken request");

    // Call Cardcom API to charge the token
    const response = await fetch("https://secure.cardcom.solutions/Interface/ChargeToken.aspx", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(Object.entries(payload).flatMap(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return Object.entries(value).map(([innerKey, innerValue]) => [`${key}.${innerKey}`, String(innerValue)]);
        }
        return [[key, String(value)]];
      })).toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cardcom API error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        status: "error", 
        message: "Failed to process payment", 
        details: errorText 
      }), { 
        status: response.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse the API response
    const cardcomResponse = await response.json();
    console.log("Cardcom API response:", cardcomResponse);

    // Check if the payment was successful
    if (cardcomResponse.ResponseCode === 0) {
      // If we have userId and Supabase credentials, we can log the transaction
      if (userId) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE");
          
          if (supabaseUrl && supabaseKey) {
            // Log the successful payment
            await fetch(`${supabaseUrl}/rest/v1/payment_transactions`, {
              method: "POST",
              headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({
                user_id: userId,
                plan_id: planId || null,
                amount,
                payment_method: "credit_card",
                transaction_id: cardcomResponse.InternalDealNumber || externalUniqTranId,
                approval_code: cardcomResponse.ApprovalNumber || "",
                status: "completed",
                last_digits: cardcomResponse.CardNumber5 || "****"
              })
            });
          }
        } catch (logError) {
          console.error("Error logging payment transaction:", logError);
          // Continue with the success response even if logging fails
        }
      }

      // Return success response
      return new Response(JSON.stringify({
        status: "approved",
        transactionId: cardcomResponse.InternalDealNumber,
        approvalNumber: cardcomResponse.ApprovalNumber || "",
        message: "Payment successful"
      }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } else {
      // Return declined response with reason
      return new Response(JSON.stringify({
        status: "declined",
        reason: cardcomResponse.Description || "Payment declined",
        errorCode: cardcomResponse.ResponseCode
      }), { 
        status: 402, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  } catch (err) {
    console.error("Payment processing error:", err);
    return new Response(JSON.stringify({ 
      status: "error", 
      message: err.message || "Internal server error" 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
