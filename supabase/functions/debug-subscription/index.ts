
// Debug edge function to help test and fix subscriptions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Debug subscription function started");
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      throw new Error("Server configuration error: Missing environment variables");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { userId, forceCreate } = await req.json();
    
    console.log(`Debug subscription request for user: ${userId}, forceCreate: ${forceCreate}`);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing user ID" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get current user profile to ensure they exist
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("User profile not found:", profileError);
      return new Response(
        JSON.stringify({ 
          error: "User not found",
          details: profileError
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check for any payment records first
    // Enhanced to check payment_logs and payment_webhooks
    const { data: paymentRecords, error: paymentError } = await supabaseClient
      .from("payment_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
      
    if (paymentError) {
      console.warn("Error fetching payment records:", paymentError);
    }

    // If no payment records found in payment_logs, check payment_webhooks for any successful payments
    let webhookPayments = [];
    if (!paymentRecords || paymentRecords.length === 0) {
      const { data: webhookData, error: webhookError } = await supabaseClient
        .from("payment_webhooks")
        .select("*")
        .eq("processed", true)
        .filter("payload->ReturnValue", "eq", userId)
        .order("created_at", { ascending: false })
        .limit(5);
        
      if (!webhookError && webhookData && webhookData.length > 0) {
        webhookPayments = webhookData;
        console.log("Found webhook payment records for user:", webhookPayments);
      }
    }

    // Check for existing subscription
    const { data: existingSub, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (subError) {
      console.error("Error checking existing subscription:", subError);
      throw new Error(`Database error: ${subError.message}`);
    }
    
    // Determine plan type based on payment records
    let planType = "monthly"; // Default plan
    let highestPayment = { amount: 0 };
    
    if (paymentRecords && paymentRecords.length > 0) {
      highestPayment = paymentRecords.reduce((max, record) => {
        return (record.amount > max.amount) ? record : max;
      }, { amount: 0 });
      
      if (highestPayment.amount > 900) {
        planType = "vip";
      } else if (highestPayment.amount > 100) {
        planType = "annual";
      } else {
        planType = "monthly";
      }
      
      // If plan_id is specified in the payment record, use that instead
      if (highestPayment.plan_id) {
        planType = highestPayment.plan_id;
      }
      
      console.log(`Determined plan type from payments: ${planType}, highest amount: ${highestPayment.amount}`);
    } else if (webhookPayments.length > 0) {
      // Try to determine plan from webhook data
      for (const webhookPayment of webhookPayments) {
        if (webhookPayment.payload && webhookPayment.payload.Amount) {
          const amount = Number(webhookPayment.payload.Amount);
          if (amount > highestPayment.amount) {
            highestPayment = { amount };
            
            // Determine plan type from amount
            if (amount > 900) {
              planType = "vip";
            } else if (amount > 100) {
              planType = "annual";
            } else {
              planType = "monthly";
            }
          }
        }
      }
      console.log(`Determined plan type from webhook data: ${planType}, highest amount: ${highestPayment.amount}`);
    }
    
    const now = new Date();
    const subscriptionExpiry = new Date(now);
    
    // Set appropriate subscription period based on plan type
    if (planType === "monthly") {
      subscriptionExpiry.setDate(now.getDate() + 30); // 30 days
    } else if (planType === "annual") {
      subscriptionExpiry.setFullYear(now.getFullYear() + 1); // 1 year
    } else {
      // VIP or other plans - set to far future (10 years)
      subscriptionExpiry.setFullYear(now.getFullYear() + 10); 
    }

    // Generate payment method info from available data
    let paymentMethod = {
      lastFourDigits: "1234",
      expiryMonth: "12",
      expiryYear: "25"
    };
    
    // Try to get real payment method info from payment records
    if (paymentRecords && paymentRecords.length > 0) {
      const latestPayment = paymentRecords[0];
      if (latestPayment.payment_data?.card_info) {
        const cardInfo = latestPayment.payment_data.card_info;
        paymentMethod.lastFourDigits = cardInfo.last4 || cardInfo.lastFourDigits || "1234";
        paymentMethod.expiryMonth = cardInfo.expiryMonth || cardInfo.month || "12";
        paymentMethod.expiryYear = cardInfo.expiryYear || cardInfo.year || "25";
        
        console.log("Using payment method from payment record:", paymentMethod);
      }
    } else if (webhookPayments.length > 0) {
      // Try to extract card info from webhook payload
      const latestWebhook = webhookPayments[0];
      if (latestWebhook.payload) {
        paymentMethod.lastFourDigits = latestWebhook.payload.Last4CardDigits || "1234";
        paymentMethod.expiryMonth = latestWebhook.payload.CardMonth || "12";
        paymentMethod.expiryYear = latestWebhook.payload.CardYear || "25";
        
        console.log("Using payment method from webhook data:", paymentMethod);
      }
    }

    if (existingSub && existingSub.length > 0) {
      // Don't update if there's already an active subscription and forceCreate is not true
      if (existingSub[0].status === "active" && !forceCreate) {
        return new Response(
          JSON.stringify({
            message: "Subscription is already active",
            subscription: existingSub[0]
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Update existing subscription to active
      const { data: updatedSub, error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          status: "active",
          cancelled_at: null,
          current_period_ends_at: subscriptionExpiry.toISOString(),
          plan_type: planType,
          payment_method: paymentMethod,
          updated_at: now.toISOString()
        })
        .eq("id", existingSub[0].id)
        .select();

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        
        // Log error to system_logs
        await supabaseClient
          .from("system_logs")
          .insert({
            level: "ERROR",
            function_name: "debug-subscription",
            message: `Failed to update subscription for user ${userId}`,
            details: {
              error: updateError.message,
              subscription_id: existingSub[0].id,
              user_id: userId
            }
          });
          
        return new Response(
          JSON.stringify({ 
            error: "Failed to update subscription",
            details: updateError
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Create a log entry for this activation
      await supabaseClient
        .from("payment_logs")
        .insert({
          user_id: userId,
          plan_id: planType,
          transaction_id: `debug_${now.getTime()}`,
          amount: 0, // Debug activation has no cost
          currency: "ILS",
          payment_status: "debug_activated",
          payment_data: {
            debug_activation: true,
            previous_status: existingSub[0].status,
            expires_at: subscriptionExpiry.toISOString()
          }
        });

      console.log("Subscription updated successfully:", updatedSub);
      
      // Log successful operation
      await supabaseClient
        .from("system_logs")
        .insert({
          level: "INFO",
          function_name: "debug-subscription",
          message: `Successfully updated subscription for user ${userId}`,
          details: {
            subscription_id: updatedSub[0].id,
            plan_type: planType,
            user_id: userId
          }
        });

      return new Response(
        JSON.stringify({
          message: "Subscription updated successfully",
          subscription: updatedSub[0]
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } else {
      // Create a new subscription
      const { data: newSub, error: insertError } = await supabaseClient
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_type: planType,
          status: "active",
          current_period_ends_at: subscriptionExpiry.toISOString(),
          payment_method: paymentMethod,
          contract_signed: true
        })
        .select();

      if (insertError) {
        console.error("Error creating subscription:", insertError);
        
        // Log error to system_logs
        await supabaseClient
          .from("system_logs")
          .insert({
            level: "ERROR",
            function_name: "debug-subscription",
            message: `Failed to create subscription for user ${userId}`,
            details: {
              error: insertError.message,
              user_id: userId
            }
          });
          
        return new Response(
          JSON.stringify({ 
            error: "Failed to create subscription",
            details: insertError
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Create a log entry for this activation
      await supabaseClient
        .from("payment_logs")
        .insert({
          user_id: userId,
          plan_id: planType,
          transaction_id: `debug_${now.getTime()}`,
          amount: 0, // Debug activation has no cost
          currency: "ILS",
          payment_status: "debug_created",
          payment_data: {
            debug_creation: true,
            expires_at: subscriptionExpiry.toISOString()
          }
        });

      console.log("New subscription created successfully:", newSub);
      
      // Log successful operation
      await supabaseClient
        .from("system_logs")
        .insert({
          level: "INFO",
          function_name: "debug-subscription",
          message: `Successfully created subscription for user ${userId}`,
          details: {
            subscription_id: newSub[0].id,
            plan_type: planType,
            user_id: userId
          }
        });

      return new Response(
        JSON.stringify({
          message: "Subscription created successfully",
          subscription: newSub[0]
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error in debug subscription function:", error);
    
    // Try to log the error to the database
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabaseClient
          .from("system_logs")
          .insert({
            level: "ERROR",
            function_name: "debug-subscription",
            message: error.message || "Unknown error",
            details: {
              stack: error.stack
            }
          });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error",
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
