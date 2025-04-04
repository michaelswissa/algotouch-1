
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Cardcom API configuration
const CARDCOM_TERMINAL_NUMBER = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "";
const CARDCOM_USERNAME = Deno.env.get("CARDCOM_USERNAME") || "";
const CARDCOM_API_NAME = Deno.env.get("CARDCOM_API_NAME") || "APIv10Payments";
const CARDCOM_API_PASSWORD = Deno.env.get("CARDCOM_API_PASSWORD") || "";
const CARDCOM_API_URL = "https://secure.cardcom.solutions/Interface/LowProfile.aspx";

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  userId: string;
  planId: string;
  fullName: string;
  email: string;
  phone: string;
  amount: number;
  currency: string;
  language: string;
  description: string;
  successUrl: string;
  failureUrl: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate API keys exist
  if (!CARDCOM_TERMINAL_NUMBER || !CARDCOM_USERNAME || !CARDCOM_API_PASSWORD) {
    console.error("Missing Cardcom API credentials");
    return new Response(
      JSON.stringify({ 
        error: "Payment service configuration incomplete. Please contact support." 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    // Parse the payment request
    const payload: PaymentRequest = await req.json();
    const {
      userId,
      planId,
      fullName,
      email,
      phone,
      amount,
      currency = "ILS",
      language = "he",
      description,
      successUrl,
      failureUrl,
    } = payload;

    // Validate required fields
    if (!userId || !planId || !fullName || !email || !amount || !successUrl || !failureUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required payment parameters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create unique order ID based on timestamp and user ID
    const orderId = `${Date.now()}-${userId.substring(0, 8)}`;
    
    // Format amount to 2 decimal places (Cardcom requirement)
    const formattedAmount = Number(amount).toFixed(2);

    // Build the URL parameters for Cardcom low profile page
    const urlParams = new URLSearchParams({
      terminalnumber: CARDCOM_TERMINAL_NUMBER,
      username: CARDCOM_USERNAME,
      APIName: CARDCOM_API_NAME,
      APIPassword: CARDCOM_API_PASSWORD,
      codepage: '65001', // UTF-8
      Operation: 'Init',
      Language: language,
      CoinID: currency === 'ILS' ? '1' : '2', // 1 for ILS, 2 for USD
      SumToBill: formattedAmount,
      ProductName: description || `Subscription plan: ${planId}`,
      SuccessRedirectUrl: successUrl,
      ErrorRedirectUrl: failureUrl,
      IndicatorUrl: `https://ndhakvhrrkczgylcmyoc.supabase.co/functions/v1/cardcom-payment-callback?userId=${userId}&planId=${planId}`,
      ReturnValue: orderId,
      ShowInvoiceHead: 'true',
      InvoiceHead: 'AlgoTouch Subscription',
      CustomerName: fullName,
      CustomerEmail: email,
      CustomerPhone: phone || ''
    });

    // Send request to Cardcom
    console.log(`Sending payment request to Cardcom for user ${userId}, plan ${planId}`);
    const response = await fetch(`${CARDCOM_API_URL}?${urlParams.toString()}`, {
      method: 'GET',
    });

    // Get text response from Cardcom
    const cardcomResponse = await response.text();
    console.log("Cardcom response:", cardcomResponse);

    // Parse response from Cardcom
    // Cardcom returns a string with key=value pairs separated by ';'
    const responseMap: Record<string, string> = {};
    cardcomResponse.split(';').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) responseMap[key.trim()] = value.trim();
    });

    // Check for successful initialization
    if (responseMap.ResponseCode === '0') {
      // Return the payment URL to redirect the user
      return new Response(
        JSON.stringify({
          success: true,
          paymentUrl: responseMap.LowProfileCode,
          orderId: orderId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      console.error("Cardcom error:", responseMap);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Payment initialization failed: ${responseMap.Description || 'Unknown error'}`,
          code: responseMap.ResponseCode
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error) {
    console.error("Exception in cardcom-payment function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
