
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Get request body
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing userId parameter" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user exists
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user.user) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    // Check if user already has subscription
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    // Only proceed if no subscription exists yet
    if (!existingSubscription) {
      console.log(`No subscription found for user ${userId}, checking for payment logs...`);
      
      // Check for successful payment logs
      const { data: paymentLogs } = await supabase
        .from("user_payment_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);
      
      // Check for payment sessions
      const { data: sessions } = await supabase
        .from("payment_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (paymentLogs?.length) {
        console.log(`Found payment log for user ${userId}, creating subscription...`);
        
        const paymentLog = paymentLogs[0];
        const planType = sessions?.[0]?.plan_id || 
                         paymentLog.transaction_details?.plan_id || 
                         'monthly';
        
        // Create subscription record
        const now = new Date();
        let periodEnd = null;
        let trialEnd = null;
        let nextChargeDate = null;
        
        if (planType === 'monthly') {
          // Set a 30-day trial for monthly plans
          trialEnd = new Date(now);
          trialEnd.setDate(trialEnd.getDate() + 30);
          nextChargeDate = new Date(trialEnd);
        } else if (planType === 'annual') {
          // Set 1-year period for annual plans
          periodEnd = new Date(now);
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          nextChargeDate = new Date(periodEnd);
        }
        
        let paymentMethod: any = {};
        
        // Try to extract payment method details
        if (paymentLog.transaction_details?.payment_method) {
          const pm = paymentLog.transaction_details.payment_method;
          paymentMethod = {
            type: "credit_card",
            brand: pm.brand || "",
            lastFourDigits: pm.last4 || "",
            expiryMonth: pm.expiryMonth || "12",
            expiryYear: pm.expiryYear || new Date().getFullYear().toString().substr(-2)
          };
        }
        
        // Create a subscription record
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: userId,
            plan_type: planType,
            status: planType === 'monthly' ? 'trial' : 'active',
            trial_ends_at: trialEnd?.toISOString(),
            current_period_ends_at: periodEnd?.toISOString(),
            next_charge_date: nextChargeDate?.toISOString(),
            payment_method: paymentMethod,
            contract_signed: true,
            contract_signed_at: now.toISOString()
          });
        
        if (subscriptionError) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Error creating subscription: ${subscriptionError.message}` 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
        
        // Mark all payment sessions as processed
        if (sessions?.length) {
          await supabase
            .from("payment_sessions")
            .update({
              payment_details: {
                ...sessions[0].payment_details,
                processed: true,
                processed_at: new Date().toISOString()
              }
            })
            .eq("id", sessions[0].id);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Subscription created successfully",
            planType
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "User already has a subscription",
          subscription: existingSubscription
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "No payment logs found, no action needed" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error("Error synchronizing subscription:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
