
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookRepairRequest {
  email: string;
  userId?: string;
  lowProfileId?: string;
  forceRefresh?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with admin key for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { email, userId, lowProfileId, forceRefresh } = await req.json() as WebhookRepairRequest;

    if (!email && !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Email or userId is required" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    console.log("Reprocessing webhook for:", { email, userId, lowProfileId, forceRefresh });

    // Step 1: Find the user if only email is provided
    let targetUserId = userId;
    if (!targetUserId && email) {
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .limit(1)
        .single();

      if (userError) {
        console.error("Error finding user by email:", userError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "User not found by email" 
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404 
          }
        );
      }

      targetUserId = userData.id;
    }

    console.log("Found user ID:", targetUserId);

    // Step 2: Log this repair attempt
    await supabase
      .from('subscription_repair_logs')
      .insert({
        user_id: targetUserId,
        email: email,
        repair_type: 'reprocess_webhook',
        details: {
          repairTime: new Date().toISOString(),
          lowProfileId,
          forceRefresh
        }
      });

    // Step 3: Check for payment tokens
    const { data: paymentTokens, error: tokenError } = await supabase
      .from('recurring_payments')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Step 4: Check if we have a subscription already
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1);

    let hasValidToken = false;
    let hasValidSubscription = false;
    let repairActions = [];

    // Check token validity
    if (!tokenError && paymentTokens && paymentTokens.length > 0) {
      const token = paymentTokens[0];
      const tokenExpiry = new Date(token.token_expiry);
      hasValidToken = token.is_valid && tokenExpiry > new Date();

      if (!token.is_valid && forceRefresh) {
        // Attempt to repair the token if it's marked as invalid but we're forcing refresh
        const { error: tokenUpdateError } = await supabase
          .from('recurring_payments')
          .update({ 
            is_valid: true,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', token.id);

        if (!tokenUpdateError) {
          hasValidToken = true;
          repairActions.push('Reactivated payment token');
        }
      }
    }

    // Check subscription validity
    if (!subscriptionError && subscriptionData && subscriptionData.length > 0) {
      const subscription = subscriptionData[0];
      
      // Check if this is a valid subscription
      const now = new Date();
      const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
      const periodEndsAt = subscription.current_period_ends_at ? new Date(subscription.current_period_ends_at) : null;
      
      const isActive = subscription.status === 'active';
      const isTrial = subscription.status === 'trial' && trialEndsAt && trialEndsAt > now;
      const isPeriodValid = periodEndsAt && periodEndsAt > now;
      
      hasValidSubscription = isActive || isTrial || isPeriodValid;

      // If subscription is not valid but we have a valid token, repair the subscription
      if (!hasValidSubscription && hasValidToken && forceRefresh) {
        // Set a new end date based on subscription type
        const newEndDate = new Date();
        if (subscription.plan_type === 'monthly') {
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        } else if (subscription.plan_type === 'yearly' || subscription.plan_type === 'annual') {
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        } else {
          newEndDate.setMonth(newEndDate.getMonth() + 1); // Default to 1 month
        }

        // Update subscription status
        const { error: subUpdateError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'active',
            trial_ends_at: null,
            current_period_ends_at: newEndDate.toISOString(),
            updated_at: new Date().toISOString(),
            cancelled_at: null,
            fail_count: 0
          })
          .eq('id', subscription.id);

        if (!subUpdateError) {
          hasValidSubscription = true;
          repairActions.push('Reactivated subscription');
        }
      }

      // If no valid subscription exists but we have a valid token, create a new subscription
      if (!hasValidSubscription && hasValidToken && !subscriptionData.length) {
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + 1); // Default to 1 month

        // Create a new subscription
        const { error: createSubError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: targetUserId,
            plan_type: 'monthly', // Default to monthly
            status: 'active',
            current_period_ends_at: newEndDate.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            contract_signed: true,
            contract_signed_at: new Date().toISOString(),
            payment_method: {
              token: paymentTokens[0].token,
              last4Digits: paymentTokens[0].last_4_digits,
              cardType: paymentTokens[0].card_type
            }
          });

        if (!createSubError) {
          hasValidSubscription = true;
          repairActions.push('Created new subscription');
        }
      }
    }

    // If we still don't have a valid token or subscription, check payment logs
    if ((!hasValidToken || !hasValidSubscription) && lowProfileId) {
      // Check if there's a payment record with this lowProfileId
      const { data: paymentLogs, error: paymentError } = await supabase
        .from('user_payment_logs')
        .select('*')
        .eq('token', lowProfileId)
        .limit(1);

      if (!paymentError && paymentLogs && paymentLogs.length > 0) {
        // We found a payment record, try to restore the subscription
        const payment = paymentLogs[0];
        
        // Create a token if we don't have one
        if (!hasValidToken) {
          const tokenExpiry = new Date();
          tokenExpiry.setFullYear(tokenExpiry.getFullYear() + 5); // 5 years validity

          const { error: createTokenError } = await supabase
            .from('recurring_payments')
            .insert({
              user_id: targetUserId,
              token: payment.token,
              token_expiry: tokenExpiry.toISOString(),
              last_4_digits: payment.payment_data?.last4Digits || "0000",
              card_type: payment.payment_data?.cardType || "unknown",
              status: 'active',
              is_valid: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (!createTokenError) {
            hasValidToken = true;
            repairActions.push('Created new payment token from payment logs');
          }
        }

        // Create a subscription if we don't have one
        if (!hasValidSubscription) {
          const newEndDate = new Date();
          newEndDate.setMonth(newEndDate.getMonth() + 1); // Default to 1 month

          // Create a new subscription
          const { error: createSubError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: targetUserId,
              plan_type: payment.payment_data?.planType || 'monthly',
              status: 'active',
              current_period_ends_at: newEndDate.toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              contract_signed: true,
              contract_signed_at: new Date().toISOString(),
              payment_method: payment.payment_data
            });

          if (!createSubError) {
            hasValidSubscription = true;
            repairActions.push('Created new subscription from payment logs');
          }
        }
      }
    }

    // Log repair attempt outcome
    await supabase
      .from('subscription_repair_logs')
      .update({
        details: {
          repairTime: new Date().toISOString(),
          lowProfileId,
          forceRefresh,
          outcome: {
            hasValidToken,
            hasValidSubscription,
            repairActions
          }
        },
        result: hasValidSubscription ? 'success' : 'failure'
      })
      .eq('user_id', targetUserId)
      .eq('repair_type', 'reprocess_webhook')
      .order('created_at', { ascending: false })
      .limit(1);

    // Return success if we have a valid subscription
    if (hasValidSubscription) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Subscription verified and repaired",
          status: "active",
          actions: repairActions
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } else if (hasValidToken) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment token is valid but subscription needs attention",
          status: "token_only", 
          actions: repairActions
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Could not find or repair subscription",
          actions: repairActions
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error processing webhook repair:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Internal server error",
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
