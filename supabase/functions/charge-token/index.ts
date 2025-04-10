
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

interface ChargeTokenRequest {
  token: string;
  amount?: number;
  userId?: string;
  planId?: string;
  customerId?: string;
  numOfPayments?: number;
  cardholderName?: string;
  email?: string;
  phone?: string;
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

    if (!terminalNumber || !apiName || !apiPassword) {
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
    const requestData: ChargeTokenRequest = await req.json();
    
    // Validate required fields
    if (!requestData.token) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing required fields", 
          details: "Token is required" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Set default values if not provided
    const amount = requestData.amount || 100; // 1.00 ILS
    const numOfPayments = requestData.numOfPayments || 1;
    const externalId = `charge_${new Date().getTime()}`;

    // Create payload for Cardcom ChargeToken API
    const payload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      ApiPassword: apiPassword,
      TokenToCharge: {
        Token: requestData.token,
        SumToBill: amount,
        NumOfPayments: numOfPayments,
        APILevel: "10",
        UniqAsmachta: externalId,
        UniqAsmachtaReturnOriginal: true,
        CoinID: 1, // ILS
      }
    };

    // Add optional fields if provided
    if (requestData.cardholderName) {
      payload.TokenToCharge.CardOwnerName = requestData.cardholderName;
    }
    
    if (requestData.email) {
      payload.TokenToCharge.CardOwnerEmail = requestData.email;
    }
    
    if (requestData.phone) {
      payload.TokenToCharge.CardOwnerPhone = requestData.phone;
    }

    console.log("Sending ChargeToken request:", {
      ...payload,
      ApiPassword: "********" // Mask password in logs
    });

    // Call Cardcom API to charge the token
    const response = await fetch("https://secure.cardcom.solutions/Interface/ChargeToken.aspx", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(Object.entries(payload).flatMap(([key, value]) => {
        if (typeof value === "object") {
          return Object.entries(value).map(([subKey, subValue]) => [`${key}.${subKey}`, subValue]);
        }
        return [[key, value]];
      })).toString()
    });

    const responseText = await response.text();
    console.log("Cardcom API raw response:", responseText);
    
    // Parse response text as key=value pairs
    const responseData: Record<string, string> = {};
    responseText.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        responseData[key] = decodeURIComponent(value);
      }
    });
    
    console.log("Parsed Cardcom response:", responseData);

    // Check if the charge was successful
    const isApproved = responseData.ResponseCode === "0";
    const transactionId = responseData.InternalDealNumber || null;
    const approvalNumber = responseData.ApprovalNumber || null;

    // Log the transaction in the database
    if (requestData.userId) {
      try {
        const { error: dbError } = await supabase
          .from('user_payment_logs')
          .insert({
            user_id: requestData.userId,
            token: requestData.token,
            amount: amount,
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
    }

    // Return the charge result
    return new Response(
      JSON.stringify({
        success: isApproved,
        message: responseData.Description || (isApproved ? "Payment successful" : "Payment failed"),
        transactionId: transactionId,
        approvalNumber: approvalNumber,
        errorCode: isApproved ? undefined : responseData.ResponseCode,
        errorDetails: isApproved ? undefined : responseData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error charging token:", error);
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
