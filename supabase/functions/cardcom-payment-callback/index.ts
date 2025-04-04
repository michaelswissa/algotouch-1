
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if Supabase credentials are available
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    return new Response(
      JSON.stringify({ error: "Server configuration incomplete" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    // Parse URL to get query parameters
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const planId = url.searchParams.get("planId");
    
    // Get cardcom parameters
    const cardcomStatus = url.searchParams.get("ResponseCode") || "";
    const transactionId = url.searchParams.get("InternalDealNumber") || "";
    const cardLastDigits = url.searchParams.get("CardSuffix") || "";
    const cardExpiration = url.searchParams.get("CardExpiration") || "";
    const amount = url.searchParams.get("SumToBill") || "0";
    
    console.log(`Received payment callback for user ${userId}, plan ${planId}, status: ${cardcomStatus}`);

    // If missing required parameters, return error
    if (!userId || !planId) {
      console.error("Missing required parameters in callback");
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // If payment was successful (0 is success code from Cardcom)
    if (cardcomStatus === "0") {
      // Record the payment in payment_history
      const { error: paymentError } = await supabase
        .from("payment_history")
        .insert({
          user_id: userId,
          subscription_id: userId, // Using user_id temporarily, could be updated later
          amount: parseFloat(amount),
          currency: "ILS",
          status: "completed",
          payment_method: {
            type: "credit_card",
            provider: "cardcom",
            transaction_id: transactionId,
            card_last_digits: cardLastDigits,
            card_expiration: cardExpiration
          }
        });

      if (paymentError) {
        console.error("Error recording payment:", paymentError);
      }

      // Update user subscription
      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan_type: planId,
          status: "active",
          payment_method: {
            type: "credit_card",
            provider: "cardcom",
            card_last_digits: cardLastDigits,
            card_expiration: cardExpiration
          },
          // Set subscription period end to 30 days from now for monthly plans or 365 days for yearly
          current_period_ends_at: new Date(
            Date.now() + (planId.includes("monthly") ? 30 : 365) * 24 * 60 * 60 * 1000
          ).toISOString()
        });

      if (subscriptionError) {
        console.error("Error updating subscription:", subscriptionError);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Payment processed successfully" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      // Record failed payment
      await supabase
        .from("payment_history")
        .insert({
          user_id: userId,
          subscription_id: userId,
          amount: parseFloat(amount),
          currency: "ILS",
          status: "failed",
          payment_method: {
            type: "credit_card",
            provider: "cardcom",
            error_code: cardcomStatus
          }
        });

      return new Response(
        JSON.stringify({ success: false, message: "Payment failed" }),
        {
          status: 200, // Still return 200 to acknowledge receipt
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error) {
    console.error("Exception in payment callback:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
