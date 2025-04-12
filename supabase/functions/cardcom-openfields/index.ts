
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.3";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get environment variables for Cardcom API
const CARDCOM_TERMINAL_NUMBER = parseInt(Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "0", 10);
const CARDCOM_API_NAME = Deno.env.get("CARDCOM_API_NAME") || "";
const CARDCOM_API_PASSWORD = Deno.env.get("CARDCOM_API_PASSWORD") || "";
const CARDCOM_API_URL = Deno.env.get("CARDCOM_API_URL") || "https://secure.cardcom.solutions";

// Plan prices in ILS
const PLAN_PRICES = {
  monthly: 371,
  annual: 3371,
  vip: 13121
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId, planName, amount, userEmail, userName, userId, isRegistration, registrationData, enable3DS } = await req.json();

    // Validate the plan and amount
    if (!planId || !PLAN_PRICES[planId as keyof typeof PLAN_PRICES]) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid plan ID" }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // Validate that the amount matches the plan
    const expectedAmount = PLAN_PRICES[planId as keyof typeof PLAN_PRICES];
    if (Math.abs(Number(amount) - expectedAmount) > 0.01) {
      console.error(`Amount mismatch: expected ${expectedAmount}, got ${amount}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid amount for plan. Expected: ${expectedAmount}` 
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // Get the base URL for redirects
    const origin = req.headers.get("origin") || "http://localhost:5173";
    
    // Prepare success and failure URLs
    const successRedirectUrl = `${origin}/subscription?success=true&planId=${planId}`;
    const failedRedirectUrl = `${origin}/subscription?error=true&planId=${planId}`;
    const indicatorUrl = `${origin}/api/payment-webhook`; // This would be your webhook endpoint

    // Create LowProfile request for Cardcom
    const createLPRequest = {
      TerminalNumber: CARDCOM_TERMINAL_NUMBER,
      ApiName: CARDCOM_API_NAME,
      ApiPassword: CARDCOM_API_PASSWORD,
      Operation: "ChargeOnly",
      Amount: expectedAmount, // Use validated expected amount
      ReturnValue: userId || "", // This will be returned in the webhook
      SuccessRedirectUrl: successRedirectUrl,
      FailedRedirectUrl: failedRedirectUrl,
      WebHookUrl: indicatorUrl,
      ProductName: planName || `מנוי ${planId}`,
      Language: "he",
      ISOCoinId: 1, // ILS
      // Add 3DS configuration
      AdvancedDefinition: {
        ThreeDSecureState: enable3DS ? "Enabled" : "Auto", 
        VirtualTerminal: {
          IsEnable: false
        },
      },
      // UI definition for proper reCAPTCHA integration
      UIDefinition: {
        CardOwnerEmailValue: userEmail || "",
        CardOwnerNameValue: userName || "",
      },
      // Document info for receipt/invoice
      Document: {
        Name: userName || "Customer",
        Email: userEmail || "",
        Products: [
          { 
            Description: planName || `מנוי ${planId}`, 
            Quantity: 1, 
            UnitCost: expectedAmount,
            TotalLineCost: expectedAmount
          }
        ],
        IsAllowEditDocument: false,
        IsShowOnlyDocument: false,
        Language: "he"
      }
    };

    // Store the payment session details
    const paymentSession = {
      id: crypto.randomUUID(),
      user_id: userId || null,
      plan_id: planId,
      payment_details: {
        amount: expectedAmount,
        planName,
        currency: "ILS",
        terminal_number: CARDCOM_TERMINAL_NUMBER
      },
      email: userEmail || null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    };

    // Save the payment session to the database
    await supabase.from("payment_sessions").insert(paymentSession);

    // Create a lowProfile in Cardcom
    console.log("Creating LowProfile with Cardcom:", createLPRequest);

    const response = await fetch(`${CARDCOM_API_URL}/api/v11/LowProfile/Create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createLPRequest),
    });

    const responseData = await response.json();
    console.log("Cardcom LowProfile response:", responseData);

    if (responseData.ResponseCode !== 0) {
      throw new Error(responseData.Description || "Error creating payment session with Cardcom");
    }

    // Update payment session with lowProfileId
    await supabase
      .from("payment_sessions")
      .update({ payment_details: { ...paymentSession.payment_details, lowProfileId: responseData.LowProfileId } })
      .eq("id", paymentSession.id);

    return new Response(
      JSON.stringify({
        success: true,
        lowProfileId: responseData.LowProfileId,
        url: responseData.Url,
        sessionId: paymentSession.id
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error creating payment session:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
