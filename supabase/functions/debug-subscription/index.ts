
// This is a debug edge function to help test subscriptions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const { userId } = await req.json();

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
      .maybeSingle();

    if (existingSub) {
      // Update existing subscription to active
      const { data: updatedSub, error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          status: "active",
          cancelled_at: null,
          current_period_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          updated_at: new Date().toISOString()
        })
        .eq("id", existingSub.id)
        .select()
        .single();

      if (updateError) {
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
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + 30); // 30 days subscription

      const { data: newSub, error: insertError } = await supabaseClient
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_type: "monthly",
          status: "active",
          current_period_ends_at: endDate.toISOString(),
          payment_method: {
            lastFourDigits: "1234",
            expiryMonth: "12",
            expiryYear: "25"
          },
          contract_signed: true
        })
        .select()
        .single();

      if (insertError) {
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

      return new Response(
        JSON.stringify({
          message: "Subscription created successfully",
          subscription: newSub
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
