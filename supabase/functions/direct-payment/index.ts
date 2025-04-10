
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, userId, planId, operationType = 3, amount = 0 } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const CARDCOM_TERMINAL = Deno.env.get("CARDCOM_TERMINAL");
    const CARDCOM_USERNAME = Deno.env.get("CARDCOM_USERNAME");
    const CARDCOM_API_PASSWORD = Deno.env.get("CARDCOM_API_PASSWORD");

    if (!CARDCOM_TERMINAL || !CARDCOM_USERNAME) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cardcom credentials not configured"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Health check endpoint
    if (req.method === "POST" && token === undefined && userId === undefined) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Direct payment function is operational",
          terminal: CARDCOM_TERMINAL ? "Configured" : "Not configured"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate input
    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing token"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create payment payload
    const paymentPayload = {
      TerminalNumber: CARDCOM_TERMINAL,
      ApiName: CARDCOM_USERNAME,
      TokenToCharge: {
        Token: token,
        Amount: amount > 0 ? amount : 0, // For charging or just token validation
      }
    };

    if (CARDCOM_API_PASSWORD) {
      // @ts-ignore - Adding ApiPassword if needed
      paymentPayload.ApiPassword = CARDCOM_API_PASSWORD;
    }

    // For token creation only (no charge)
    if (operationType === 3) {
      // @ts-ignore - Adding JParameter for tokenization only
      paymentPayload.TokenToCharge.JParameter = 5;
    }

    console.log("Processing payment with Cardcom:", { 
      terminal: CARDCOM_TERMINAL,
      userId,
      operationType,
      planId
    });

    // Call Cardcom API
    const cardcomResponse = await fetch("https://secure.cardcom.solutions/Interface/ChargeToken.aspx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(paymentPayload)
    });

    const cardcomResult = await cardcomResponse.json();
    console.log("Cardcom API response:", cardcomResult);

    if (cardcomResult.ResponseCode === 0) {
      // Payment was successful or token created successfully
      
      // Store payment token in database if userId is provided
      if (userId) {
        try {
          // First check if token exists
          const { data: existingTokens } = await supabase
            .from("payment_tokens")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingTokens) {
            // Update existing token
            await supabase
              .from("payment_tokens")
              .update({
                token: token,
                card_last_four: cardcomResult.CardNumEnd || "****",
                updated_at: new Date().toISOString()
              })
              .eq("user_id", userId);
          } else {
            // Create new token
            await supabase.from("payment_tokens").insert({
              user_id: userId,
              token: token,
              card_last_four: cardcomResult.CardNumEnd || "****",
              card_brand: cardcomResult.CardName104 || "Unknown",
              is_active: true,
              token_expiry: new Date(
                parseInt(`20${cardcomResult.Tokef_30?.slice(-2)}`), 
                parseInt(cardcomResult.Tokef_30?.slice(0, 2)) - 1, 
                1
              ).toISOString()
            });
          }

          // Add entry to payment history if this was a charge operation
          if (operationType !== 3 && amount > 0) {
            await supabase.from("payment_history").insert({
              user_id: userId,
              subscription_id: userId, // Using userId as subscription id for now
              amount: amount,
              status: "success",
              payment_method: {
                token: token,
                lastFourDigits: cardcomResult.CardNumEnd || "****",
                approvalNumber: cardcomResult.ApprovalNumber
              }
            });
          }

          // Update subscription status if needed
          if (planId && operationType !== 3) {
            const { data: subscriptionData } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("user_id", userId)
              .maybeSingle();

            if (subscriptionData) {
              // Update existing subscription
              await supabase
                .from("subscriptions")
                .update({
                  plan_type: planId,
                  status: "active",
                  updated_at: new Date().toISOString(),
                  payment_token_id: token
                })
                .eq("user_id", userId);
            } else {
              // Create new subscription
              const trialEndsAt = new Date();
              trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month trial

              await supabase.from("subscriptions").insert({
                user_id: userId,
                plan_type: planId,
                status: "trial",
                trial_ends_at: trialEndsAt.toISOString(),
                payment_method: {
                  token: token,
                  lastFourDigits: cardcomResult.CardNumEnd || "****"
                },
                payment_token_id: token
              });
            }
          }
        } catch (dbError) {
          console.error("Database error:", dbError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: cardcomResult.InternalDealNumber,
          tokenInfo: {
            token: token,
            lastFourDigits: cardcomResult.CardNumEnd || "****",
            expiryMonth: parseInt(cardcomResult.Tokef_30?.slice(0, 2) || "0"),
            expiryYear: parseInt(cardcomResult.Tokef_30?.slice(-2) || "0")
          },
          approvalNumber: cardcomResult.ApprovalNumber
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } else {
      // Payment failed
      console.error("Payment failed:", cardcomResult);
      
      // Log error for debugging
      try {
        if (userId) {
          await supabase.from("payment_errors").insert({
            user_id: userId,
            error_code: cardcomResult.ResponseCode?.toString(),
            error_message: cardcomResult.Description,
            payment_details: {
              planId,
              operationType
            },
            context: "direct-payment"
          });
        }
      } catch (logError) {
        console.error("Error logging payment failure:", logError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: cardcomResult.Description || "Transaction failed",
          errorCode: cardcomResult.ResponseCode
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (err) {
    console.error("Payment processing error:", err);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
