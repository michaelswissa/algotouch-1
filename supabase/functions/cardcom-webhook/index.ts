
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
    // Extract the webhook params - CardCom sends webhook data as URL parameters
    const url = new URL(req.url);
    const params = url.searchParams;
    
    const lowProfileCode = params.get("LowProfileCode");
    const operationResponse = params.get("OperationResponse");
    const returnValue = params.get("ReturnValue");
    const cardToken = params.get("Token");
    const tokenExDate = params.get("TokenExDate");
    const transactionId = params.get("InternalDealNumber");

    // Log the webhook request for debugging
    console.log("CardCom webhook received:", {
      lowProfileCode,
      operationResponse,
      returnValue,
      hasToken: Boolean(cardToken),
      tokenExDate,
      transactionId
    });

    if (!lowProfileCode || !returnValue) {
      throw new Error("Missing required webhook parameters");
    }

    // Set up Supabase client for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this transaction has already been processed to avoid duplicates
    const { data: existingPayment, error: checkError } = await supabase
      .rpc("check_duplicate_payment", { low_profile_id: lowProfileCode });

    if (checkError) {
      console.error("Error checking for duplicate payment:", checkError);
    } else if (existingPayment) {
      console.log("Duplicate payment webhook ignored for:", lowProfileCode);
      return new Response("OK - Duplicate", { status: 200, headers: corsHeaders });
    }

    // Find the payment session
    const { data: sessionData, error: sessionError } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("id", returnValue)
      .maybeSingle();

    if (sessionError || !sessionData) {
      console.error("Error retrieving payment session:", sessionError);
      throw new Error(`Payment session not found for ID: ${returnValue}`);
    }

    // Process the payment result
    const isSuccess = operationResponse === "0";
    const userId = sessionData.user_id;
    const planId = sessionData.plan_id;
    const paymentDetails = sessionData.payment_details || {};
    
    // Record the payment log
    await supabase
      .from("user_payment_logs")
      .insert({
        user_id: userId,
        token: lowProfileCode,
        status: isSuccess ? "success" : "failed",
        amount: paymentDetails.amount || 0,
        transaction_details: {
          cardToken: cardToken,
          tokenExDate: tokenExDate,
          transactionId: transactionId,
          lowProfileCode: lowProfileCode,
          planId: planId,
          sessionId: returnValue
        }
      });

    if (!isSuccess) {
      // Update session with failure status
      await supabase
        .from("payment_sessions")
        .update({
          payment_details: {
            ...paymentDetails,
            status: "failed",
            lowProfileCode: lowProfileCode,
            failure_reason: params.get("Description") || "Unknown error"
          }
        })
        .eq("id", returnValue);

      return new Response("Payment failed", { status: 200, headers: corsHeaders });
    }

    // For successful payments, create or update subscription
    if (userId) {
      // Format payment token data
      const paymentMethod = cardToken ? {
        lastFourDigits: params.get("CardNumber5") || "0000",
        expiryMonth: tokenExDate ? tokenExDate.substring(4, 6) : "12",
        expiryYear: tokenExDate ? tokenExDate.substring(0, 4) : "2030",
        token: cardToken
      } : null;

      // Calculate subscription dates
      const now = new Date();
      const trialEndsAt = paymentDetails.hasTrial ? 
        new Date(now.setDate(now.getDate() + (paymentDetails.trialDays || 30))).toISOString() : 
        null;
      
      const periodEndsAt = paymentDetails.hasTrial ? 
        trialEndsAt : // If trial, period ends when trial ends
        planId === "monthly" ? 
          new Date(now.setMonth(now.getMonth() + 1)).toISOString() : // Monthly plan
          planId === "annual" ? 
            new Date(now.setFullYear(now.getFullYear() + 1)).toISOString() : // Annual plan
            null; // VIP plan has no end date

      // Check for existing subscription
      const { data: existingSubscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingSubscription) {
        // Update existing subscription
        await supabase
          .from("subscriptions")
          .update({
            plan_type: planId,
            status: paymentDetails.hasTrial ? "trial" : "active",
            payment_method: paymentMethod,
            trial_ends_at: trialEndsAt,
            current_period_ends_at: periodEndsAt,
            next_charge_date: periodEndsAt,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingSubscription.id);
      } else {
        // Create new subscription
        await supabase
          .from("subscriptions")
          .insert({
            user_id: userId,
            plan_type: planId,
            status: paymentDetails.hasTrial ? "trial" : "active",
            payment_method: paymentMethod,
            trial_ends_at: trialEndsAt,
            current_period_ends_at: periodEndsAt,
            next_charge_date: periodEndsAt
          });
      }

      // Record payment history entry
      await supabase
        .from("payment_history")
        .insert({
          user_id: userId,
          subscription_id: existingSubscription?.id || null, // Will be updated later if needed
          amount: paymentDetails.amount,
          currency: "ILS",
          payment_method: paymentMethod,
          status: "completed",
          payment_date: new Date().toISOString()
        });
    }

    // Update payment session with success status
    await supabase
      .from("payment_sessions")
      .update({
        payment_details: {
          ...paymentDetails,
          status: "completed",
          lowProfileCode: lowProfileCode,
          cardToken: cardToken,
          tokenExDate: tokenExDate,
          transactionId: transactionId
        }
      })
      .eq("id", returnValue);

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("CardCom webhook error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "An error occurred processing the webhook",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
