
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
    const { planId, userData, email } = await req.json();

    // Get environment variables
    const CARDCOM_TERMINAL_NUMBER = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const CARDCOM_API_NAME = Deno.env.get("CARDCOM_API_NAME");
    
    if (!CARDCOM_TERMINAL_NUMBER || !CARDCOM_API_NAME) {
      throw new Error("Missing CardCom configuration");
    }

    if (!planId) {
      throw new Error("Missing required plan ID");
    }

    // Create a unique transaction ID
    const transactionId = crypto.randomUUID();

    // Set up for Supabase client for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get plan details based on plan ID
    let planDetails;
    switch (planId) {
      case "monthly":
        planDetails = {
          price: 371,
          name: "מנוי חודשי",
          hasTrial: true,
          trialDays: 30,
        };
        break;
      case "annual":
        planDetails = {
          price: 3371,
          name: "מנוי שנתי",
          hasTrial: false,
          trialDays: 0,
        };
        break;
      case "vip":
        planDetails = {
          price: 13121,
          name: "מנוי VIP",
          hasTrial: false,
          trialDays: 0,
        };
        break;
      default:
        throw new Error("Invalid plan ID");
    }

    // Build CardCom API request body
    const lowProfileBody = {
      TerminalNumber: CARDCOM_TERMINAL_NUMBER,
      ApiName: CARDCOM_API_NAME,
      ReturnValue: transactionId,
      Amount: planDetails.price,
      Language: "he",
      SuccessRedirectUrl: `${req.headers.get("origin")}/subscription-success?success=true`,
      FailedRedirectUrl: `${req.headers.get("origin")}/subscription?error=true`,
      WebHookUrl: `${req.headers.get("origin")}/api/cardcom-webhook`,
      ProductName: planDetails.name,
      ISOCoinId: 1, // ILS
    };

    if (email) {
      lowProfileBody.CardOwnerEmail = email;
    }

    // Add trial information if applicable
    if (planDetails.hasTrial) {
      // Set up the appropriate operation type and fields for trial
      lowProfileBody.Operation = "ChargeAndCreateToken";
      lowProfileBody.deferMonths = "1"; // Defer charge by 1 month
    }

    // Create payment session in database
    const { data: sessionData, error: sessionError } = await supabase
      .from("payment_sessions")
      .insert({
        id: transactionId,
        plan_id: planId,
        user_id: userData?.userId || null,
        email: email || null,
        payment_details: {
          amount: planDetails.price,
          plan_name: planDetails.name,
          currency: "ILS",
          hasTrial: planDetails.hasTrial,
          trialDays: planDetails.trialDays,
          status: "pending"
        },
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating payment session:", sessionError);
      throw new Error("Failed to create payment session");
    }

    // Make request to CardCom API
    const apiUrl = "https://secure.cardcom.solutions/Interface/LowProfile.aspx";
    const requestBody = Object.entries(lowProfileBody)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    console.log("Sending request to CardCom:", requestBody);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    });

    const responseText = await response.text();
    console.log("CardCom response:", responseText);

    // Parse response params
    const responseParams = new URLSearchParams(responseText);
    const responseCode = responseParams.get("ResponseCode");
    const lowProfileId = responseParams.get("LowProfileCode");
    const url = responseParams.get("url");

    if (responseCode !== "0" || !url) {
      throw new Error(`CardCom API error: ${responseParams.get("Description") || "Unknown error"}`);
    }

    // Update session with CardCom details
    await supabase
      .from("payment_sessions")
      .update({
        payment_details: {
          ...sessionData.payment_details,
          lowProfileId: lowProfileId,
        },
      })
      .eq("id", transactionId);

    // Return successful response with redirect URL
    return new Response(
      JSON.stringify({
        success: true,
        url: url,
        lowProfileId: lowProfileId,
        sessionId: transactionId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("CardCom payment error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "An error occurred processing the payment",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
