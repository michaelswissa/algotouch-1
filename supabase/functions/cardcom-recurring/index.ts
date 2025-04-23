
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-RECURRING] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Parse request body
    const requestData = await req.json();
    const { action, token, planType, tokenExpiryDate, lastFourDigits, subscriptionId } = requestData;

    logStep("Request data received", { action, planType });

    // Get user details from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token_string = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token_string);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.id) {
      throw new Error("User not authenticated");
    }
    
    logStep("User authenticated", { userId: user.id });

    // Handle different actions
    switch (action) {
      case 'setup': {
        if (!token || !planType) {
          throw new Error("Missing required parameters: token or planType");
        }

        logStep("Setting up recurring payment", { planType, token });

        // Store token in recurring_payments table
        const { data: paymentData, error: paymentError } = await supabaseAdmin
          .from('recurring_payments')
          .insert({
            user_id: user.id,
            token: token,
            token_expiry: tokenExpiryDate,
            status: 'active',
            last_4_digits: lastFourDigits || 'XXXX'
          })
          .select()
          .single();

        if (paymentError) {
          throw new Error(`Failed to store token: ${paymentError.message}`);
        }

        logStep("Token stored successfully", { paymentId: paymentData.id });

        // Now set up the subscription based on plan type
        const now = new Date();
        let nextChargeDate = null;
        let currentPeriodEndsAt = null;
        let trialEndsAt = null;
        
        if (planType === 'monthly') {
          // 7-day trial for monthly plan
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 7);
          nextChargeDate = new Date(trialEndsAt);
          currentPeriodEndsAt = new Date(trialEndsAt);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
        }
        
        // Create or update subscription record
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingSubscription) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan_type: planType,
              status: 'trial',
              next_charge_date: nextChargeDate,
              trial_ends_at: trialEndsAt,
              current_period_ends_at: currentPeriodEndsAt,
              payment_method: {
                token: token,
                tokenExpiryDate: tokenExpiryDate,
                lastFourDigits: lastFourDigits || 'XXXX',
              },
              updated_at: now.toISOString()
            })
            .eq('id', existingSubscription.id);
            
          logStep("Updated existing subscription", { subscriptionId: existingSubscription.id });
        } else {
          const { data: newSubscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .insert({
              user_id: user.id,
              plan_type: planType,
              status: 'trial',
              next_charge_date: nextChargeDate,
              trial_ends_at: trialEndsAt,
              current_period_ends_at: currentPeriodEndsAt,
              payment_method: {
                token: token,
                tokenExpiryDate: tokenExpiryDate,
                lastFourDigits: lastFourDigits || 'XXXX',
              }
            })
            .select()
            .single();
            
          if (subError) {
            throw new Error(`Failed to create subscription: ${subError.message}`);
          }
          
          logStep("Created new subscription", { subscriptionId: newSubscription.id });
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Recurring payment set up successfully" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
      
      case 'cancel': {
        if (!subscriptionId) {
          throw new Error("Missing required parameter: subscriptionId");
        }
        
        logStep("Cancelling subscription", { subscriptionId });
        
        // Get subscription to verify ownership
        const { data: subscription, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();
          
        if (subError || !subscription) {
          throw new Error("Subscription not found");
        }
        
        // Verify subscription belongs to user
        if (subscription.user_id !== user.id) {
          throw new Error("You do not have permission to cancel this subscription");
        }
        
        // Update subscription status
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', subscriptionId);
          
        if (updateError) {
          throw new Error(`Failed to cancel subscription: ${updateError.message}`);
        }
        
        // Also update recurring payment if exists
        if (subscription.payment_method?.token) {
          await supabaseAdmin
            .from('recurring_payments')
            .update({
              status: 'cancelled'
            })
            .eq('token', subscription.payment_method.token)
            .eq('user_id', user.id);
        }
        
        logStep("Subscription cancelled successfully", { subscriptionId });
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Subscription cancelled successfully" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "An unknown error occurred"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
