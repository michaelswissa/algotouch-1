
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

    // Check if user already has a subscription
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

    // Check for payment records to determine plan type
    const { data: paymentRecords, error: paymentError } = await supabaseClient
      .from("payment_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
      
    if (paymentError) {
      console.warn("Error fetching payment records:", paymentError);
    }
    
    // Determine plan type based on payment records
    let planType = "monthly"; // Default plan
    
    if (paymentRecords && paymentRecords.length > 0) {
      const highestPayment = paymentRecords.reduce((max, record) => {
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

    // Generate dummy payment method info if needed
    const paymentMethod = {
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
        .select()
        .single();

      if (updateError) {
        console.error("Error updating subscription:", updateError);
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

      return new Response(
        JSON.stringify({
          message: "Subscription updated successfully",
          subscription: updatedSub
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
        .select()
        .single();

      if (insertError) {
        console.error("Error creating subscription:", insertError);
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

      return new Response(
        JSON.stringify({
          message: "Subscription created successfully",
          subscription: newSub
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error in debug subscription function:", error);
    
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
