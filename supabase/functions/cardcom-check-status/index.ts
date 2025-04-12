
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lowProfileId } = await req.json();

    if (!lowProfileId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing lowProfileId parameter" }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    console.log(`Checking status for lowProfileId: ${lowProfileId}`);

    // Get the payment session by lowProfileId
    const { data: paymentSession, error: sessionError } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("payment_details->lowProfileId", lowProfileId)
      .maybeSingle();

    if (sessionError) {
      console.error("Error fetching payment session:", sessionError);
      throw new Error(`Error fetching payment session: ${sessionError.message}`);
    }

    if (!paymentSession) {
      console.log("No payment session found for lowProfileId:", lowProfileId);
      return new Response(
        JSON.stringify({ 
          ResponseCode: 400, 
          Description: "No payment session found for the given lowProfileId" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the transaction status from Cardcom API
    const requestBody = {
      TerminalNumber: CARDCOM_TERMINAL_NUMBER,
      UserName: CARDCOM_API_NAME,
      LowProfileCode: lowProfileId
    };

    console.log("Sending request to Cardcom API:", requestBody);

    const response = await fetch(`${CARDCOM_API_URL}/Interface/BillGoldGetLowProfileIndicator.aspx`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    console.log("Received response from Cardcom API:", responseData);

    // Process the response and update the database records
    if (responseData.OperationResponse === 0 && responseData.TranzactionInfo?.TranzactionId) {
      // The transaction was successful
      const transactionId = responseData.TranzactionInfo.TranzactionId;
      const amount = paymentSession.payment_details?.amount || 0;
      const planId = paymentSession.plan_id || 'monthly';
      const userId = paymentSession.user_id;
      
      console.log(`Transaction ${transactionId} was successful for user ${userId}, plan ${planId}`);

      // Update payment session record
      await supabase
        .from("payment_sessions")
        .update({
          payment_details: {
            ...paymentSession.payment_details,
            processed: true,
            transaction_id: transactionId,
            timestamp: new Date().toISOString()
          }
        })
        .eq("id", paymentSession.id);

      // Record the payment log
      await supabase
        .from("user_payment_logs")
        .insert({
          user_id: userId,
          amount: amount,
          status: "completed",
          token: lowProfileId,
          approval_code: responseData.TranzactionInfo.ApprovalNumber || "",
          transaction_details: {
            transaction_id: transactionId,
            card_last_four: responseData.TranzactionInfo.Last4CardDigitsString || "",
            card_brand: responseData.TranzactionInfo.Brand || "",
            payment_method: {
              type: "credit_card",
              brand: responseData.TranzactionInfo.Brand || "",
              last4: responseData.TranzactionInfo.Last4CardDigitsString || "",
              expiryMonth: (responseData.UIValues?.CardMonth || "").toString().padStart(2, '0'),
              expiryYear: (responseData.UIValues?.CardYear || "").toString()
            }
          }
        });

      // Invoke the subscription sync function to create/update subscription
      try {
        await supabase.functions.invoke("cardcom-subscription-sync", {
          body: { userId }
        });
      } catch (syncError) {
        console.error("Error invoking subscription sync:", syncError);
      }
    }

    // Return the Cardcom API response
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking payment status:", error);
    return new Response(
      JSON.stringify({ 
        ResponseCode: 500, 
        Description: error instanceof Error ? error.message : "An unknown error occurred" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
