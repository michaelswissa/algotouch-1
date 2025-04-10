
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { token, amount, userId } = await req.json();

    if (!token || !amount) {
      return new Response(JSON.stringify({ status: "error", message: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const terminal = Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_USER");
    const apiPassword = Deno.env.get("CARDCOM_PASSWORD");

    if (!terminal || !apiName || !apiPassword) {
      console.error("Missing required environment variables");
      return new Response(JSON.stringify({ status: "error", message: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create payload for ChargeToken API
    const payload = {
      TerminalNumber: terminal,
      ApiName: apiName,
      ApiPassword: apiPassword,
      TokenToCharge: {
        Token: token,
        SumToBill: amount,
        APILevel: "10",
        UniqAsmachta: crypto.randomUUID(),
      }
    };

    console.log("Sending charge request to Cardcom:", { ...payload, ApiPassword: "***" });

    // Convert payload to form data format
    const formData = new URLSearchParams();
    formData.append("TerminalNumber", terminal);
    formData.append("ApiName", apiName);
    formData.append("ApiPassword", apiPassword);
    formData.append("TokenToCharge.Token", token);
    formData.append("TokenToCharge.SumToBill", amount.toString());
    formData.append("TokenToCharge.APILevel", "10");
    formData.append("TokenToCharge.UniqAsmachta", crypto.randomUUID());

    // Call Cardcom API to charge the token
    const response = await fetch("https://secure.cardcom.solutions/Interface/ChargeToken.aspx", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cardcom API error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        status: "error", 
        message: "Payment provider error", 
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse response text as key=value pairs
    const responseText = await response.text();
    console.log("Cardcom API raw response:", responseText);
    
    const responseData: Record<string, string> = {};
    responseText.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        responseData[key] = decodeURIComponent(value);
      }
    });

    console.log("Parsed Cardcom response:", responseData);

    // Check if charge was successful
    const isApproved = responseData.ResponseCode === "0";
    const approvalNumber = responseData.ApprovalNumber || null;

    // Log the transaction in the database
    try {
      const { error: dbError } = await supabase
        .from('user_payment_logs')
        .insert({
          user_id: userId,
          token: token,
          amount: parseInt(amount),
          approval_code: approvalNumber,
          status: isApproved ? "success" : "failed",
          transaction_details: responseData
        });

      if (dbError) {
        console.error("Error logging transaction to database:", dbError);
      }
    } catch (dbError) {
      console.error("Exception logging transaction to database:", dbError);
    }

    if (isApproved) {
      return new Response(JSON.stringify({ 
        status: "approved",
        approvalNumber: approvalNumber,
        transactionId: responseData.InternalDealNumber || null 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ 
        status: "declined", 
        reason: responseData.Description || "Payment declined",
        errorCode: responseData.ResponseCode 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Error charging token:", err);
    return new Response(JSON.stringify({ 
      status: "error", 
      message: "Internal server error",
      details: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
