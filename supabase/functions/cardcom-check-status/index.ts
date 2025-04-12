
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lowProfileId } = await req.json();

    if (!lowProfileId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing lowProfileId" }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // Find the payment session
    const { data: paymentSession } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("payment_details->lowProfileId", lowProfileId)
      .maybeSingle();

    if (!paymentSession) {
      console.log(`No payment session found for lowProfileId: ${lowProfileId}`);
    }

    // Create the request to get LowProfile result
    const getLowProfileRequest = {
      TerminalNumber: CARDCOM_TERMINAL_NUMBER,
      ApiName: CARDCOM_API_NAME,
      LowProfileId: lowProfileId
    };

    console.log(`Checking transaction status for lowProfileId: ${lowProfileId}`);

    // Call Cardcom API to get the status
    const response = await fetch(`${CARDCOM_API_URL}/api/v11/LowProfile/GetLpResult`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getLowProfileRequest),
    });

    if (!response.ok) {
      throw new Error(`Cardcom API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Transaction status:", data);

    // Check if transaction was successful
    if (data.ResponseCode === 0 && data.TranzactionInfo?.TranzactionId) {
      console.log("Transaction successful:", data.TranzactionInfo.TranzactionId);

      // If we have a payment session and user ID, record the payment
      if (paymentSession && paymentSession.user_id) {
        // Log the successful payment
        await supabase
          .from("user_payment_logs")
          .insert({
            user_id: paymentSession.user_id,
            amount: paymentSession.payment_details.amount,
            status: "completed",
            token: lowProfileId,
            approval_code: data.TranzactionInfo.ApprovalNumber || "",
            transaction_details: {
              transaction_id: data.TranzactionInfo.TranzactionId,
              plan_id: paymentSession.plan_id,
              timestamp: new Date().toISOString(),
              card_last_four: data.TranzactionInfo.Last4CardDigitsString || "",
              is_3ds_verified: !!data.TranzactionInfo.CardNumberEntryMode?.includes("3DS"), // Check if 3DS was used
              payment_method: {
                type: "credit_card",
                brand: data.TranzactionInfo.Brand || "",
                last4: data.TranzactionInfo.Last4CardDigitsString || ""
              }
            }
          });
      }
    } else if (data.ResponseCode !== 0) {
      console.error("Transaction failed:", data.Description);

      // Log failed payment if we have session data
      if (paymentSession && paymentSession.user_id) {
        await supabase
          .from("payment_errors")
          .insert({
            user_id: paymentSession.user_id,
            error_code: data.ResponseCode.toString(),
            error_message: data.Description,
            context: "transaction_check",
            payment_details: {
              lowProfileId,
              plan_id: paymentSession.plan_id
            }
          });
      }
    }

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error checking transaction status:", error);

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
