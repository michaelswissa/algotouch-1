
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
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, planId, amount, firstName, lastName, email, phone } = body;

    if (!userId || !amount || !firstName || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const terminal = Deno.env.get("CARDCOM_TERMINAL");
    const user = Deno.env.get("CARDCOM_USER");
    const domain = Deno.env.get("PROJECT_DOMAIN");

    if (!terminal || !user || !domain) {
      console.error("Missing required environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const payload = {
      TerminalNumber: terminal,
      UserName: user,
      APILevel: "10",
      Operation: "1",
      IsCreateToken: "1",
      SendTokenInRedirect: "1",
      SuccessRedirectUrl: `${domain}/payment/token-received`,
      ErrorRedirectUrl: `${domain}/payment/token-received?status=fail`,
      CardOwnerName: `${firstName} ${lastName}`,
      Email: email,
      PhoneNumber: phone || "",
      SumToBill: amount.toString(),
      IndicatorUrl: "",
      LowProfileCode: "",
    };

    const encoded = new URLSearchParams(payload).toString();
    const iframeUrl = `https://secure.cardcom.solutions/iframe.aspx?${encoded}`;

    return new Response(JSON.stringify({ iframeUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error creating LowProfile iframe URL:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
