
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Parse the URL to get the query params from Cardcom
    const url = new URL(req.url);
    const params = url.searchParams;
    
    console.log("Cardcom callback received with params:", Object.fromEntries(params));
    
    // Key parameters from Cardcom
    const dealStatus = params.get("dealStatus");
    const lowProfileId = params.get("lowProfileId");
    const orderId = params.get("OrderId");
    const uniqueClientId = params.get("uniqueClientId"); // Usually user ID
    const planId = params.get("internalDealNumber"); // We can pass this in the payment request
    
    if (!dealStatus) {
      throw new Error("No deal status provided in callback");
    }
    
    // Set up Supabase client (using service role token to bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Log all request parameters for debugging
    console.log("Processing payment callback:", {
      dealStatus,
      lowProfileId,
      orderId,
      uniqueClientId,
      planId
    });
    
    // Process the payment status
    if (dealStatus === "0" || dealStatus === "2") { // Approved or Suspended for approval
      console.log("Payment successful, updating subscription");
      
      if (!uniqueClientId) {
        throw new Error("No user ID provided in successful payment callback");
      }
      
      // Store payment in history
      await supabase
        .from("payment_history")
        .insert({
          user_id: uniqueClientId,
          subscription_id: uniqueClientId, // Same as user_id by design
          amount: params.get("sumToBill") || 0,
          currency: "ILS",
          status: "completed",
          payment_method: {
            cardcom_id: lowProfileId,
            last_digits: params.get("last4d") || "",
            cardtype_name: params.get("cardTypeName") || "",
            transaction_id: params.get("tranId") || ""
          }
        });
      
      // Update subscription status
      const now = new Date();
      let periodEndsAt = null;
      let trialEndsAt = null;
      
      // Set up subscription period based on plan
      if (planId === "monthly") {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30-day trial
      } else if (planId === "annual") {
        periodEndsAt = new Date(now);
        periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
      } else {
        // Default to 1 month for any other plan type
        periodEndsAt = new Date(now);
        periodEndsAt.setMonth(periodEndsAt.getMonth() + 1);
      }
      
      // Update the subscription in database
      await supabase
        .from("subscriptions")
        .upsert({
          user_id: uniqueClientId,
          plan_type: planId || "monthly",
          status: planId === "monthly" ? "trial" : "active",
          trial_ends_at: trialEndsAt?.toISOString() || null,
          current_period_ends_at: periodEndsAt?.toISOString() || null,
          payment_method: {
            provider: "cardcom",
            low_profile_id: lowProfileId,
            last_digits: params.get("last4d") || "",
            cardtype_name: params.get("cardTypeName") || "",
            transaction_id: params.get("tranId") || ""
          },
          updated_at: now.toISOString()
        });
      
      console.log("Subscription updated successfully");
      
      // Redirect to success page
      const successUrl = params.get("SuccessRedirectUrl") || 
        `${Deno.env.get("SITE_URL") || "https://app.algotouch.co.il"}/subscription/success?orderId=${orderId}`;
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": successUrl
        }
      });
    } else {
      console.log("Payment failed with status:", dealStatus);
      
      // For failed payments, just log the error
      if (uniqueClientId) {
        await supabase
          .from("payment_history")
          .insert({
            user_id: uniqueClientId,
            subscription_id: uniqueClientId,
            amount: params.get("sumToBill") || 0,
            currency: "ILS",
            status: "failed",
            payment_method: {
              error_code: dealStatus,
              error_message: params.get("ErrorText") || "Unknown error",
              transaction_id: params.get("tranId") || ""
            }
          });
      }
      
      // Redirect to failure page
      const failureUrl = params.get("ErrorRedirectUrl") || 
        `${Deno.env.get("SITE_URL") || "https://app.algotouch.co.il"}/subscription/failure?error=${encodeURIComponent(params.get("ErrorText") || "Unknown error")}`;
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": failureUrl
        }
      });
    }
  } catch (error) {
    console.error("Error processing payment callback:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to process payment callback",
        details: error.message 
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
