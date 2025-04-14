
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration from environment variables or Supabase secrets
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
    const { planId, amount, currency = "ILS", invoiceInfo } = await req.json();
    
    if (!planId || !amount) {
      throw new Error("Missing required parameters: planId or amount");
    }
    
    // Generate unique transaction reference
    const transactionRef = `${user.id}-${Date.now()}`;
    
    // Prepare CardCom API request
    const cardcomPayload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      ReturnValue: transactionRef,
      Amount: amount,
      CoinID: currency === "ILS" ? 1 : 2,
      Language: "he",
      SuccessRedirectUrl: `https://yourdomain.com/payment-success`,
      FailedRedirectUrl: `https://yourdomain.com/payment-failed`,
      WebHookUrl: `https://yourdomain.com/api/webhook/cardcom`,
      ProductName: `מנוי ${planId}`,
      Operation: "ChargeAndCreateToken", // Allows future charges
      APILevel: "10",
    };
    
    // Add invoice details if provided
    if (invoiceInfo) {
      Object.assign(cardcomPayload, {
        "InvoiceHead.CustName": invoiceInfo.fullName,
        "InvoiceHead.Email": invoiceInfo.email,
        "InvoiceHead.PhoneNumber": invoiceInfo.phone,
        "InvoiceHead.Language": "he",
        "InvoiceHead.SendByEmail": true,
        "InvoiceLines1.Description": `מנוי ${planId}`,
        "InvoiceLines1.Price": amount,
        "InvoiceLines1.Quantity": 1
      });
    }
    
    // Initialize LowProfile session
    const response = await fetch(`${cardcomUrl}/Interface/LowProfile.aspx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(cardcomPayload).toString(),
    });
    
    if (!response.ok) {
      throw new Error(`CardCom API error: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);
    
    const lowProfileCode = responseParams.get("LowProfileCode");
    const responseCode = responseParams.get("ResponseCode");
    
    if (responseCode !== "0" || !lowProfileCode) {
      throw new Error(`CardCom initialization failed: ${responseParams.get("Description") || "Unknown error"}`);
    }
    
    // Store transaction details in Supabase
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .insert({
        user_id: user.id,
        low_profile_code: lowProfileCode,
        reference: transactionRef,
        plan_id: planId,
        amount: amount,
        currency: currency,
        status: 'initiated',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
      })
      .select('id')
      .single();
      
    if (sessionError) {
      throw new Error("Failed to store payment session");
    }
    
    // Return data for frontend iframe creation
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created",
        data: {
          lowProfileCode: lowProfileCode,
          terminalNumber: terminalNumber,
          sessionId: sessionData.id,
          cardcomUrl: cardcomUrl
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error("Error in cardcom-payment function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Payment initialization failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
