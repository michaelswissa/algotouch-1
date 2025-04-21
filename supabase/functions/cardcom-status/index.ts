
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lowProfileCode, sessionId, terminalNumber, timestamp, attempt, operationType, planType, forceRefresh, checkType } = await req.json();
    
    console.log(`[CARDCOM-STATUS] Checking payment status for low profile code: ${lowProfileCode}, attempt: ${attempt}`, {
      sessionId,
      operationType, 
      planType,
      forceRefresh,
      checkType
    });

    if (!lowProfileCode) {
      throw new Error("Missing low profile code");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, check if we already have a successful payment record in the database
    // This is important in case the webhook was processed but the frontend lost connection
    const { data: sessionData, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .maybeSingle();

    console.log(`[CARDCOM-STATUS] Session lookup result:`, { 
      found: !!sessionData, 
      status: sessionData?.status,
      error: sessionError?.message
    });

    // If we found a completed session, return success immediately
    if (sessionData && sessionData.status === 'completed' && sessionData.transaction_id) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already completed successfully",
          data: {
            transactionId: sessionData.transaction_id,
            isTokenOperation: operationType === 'token_only',
            planType: sessionData.plan_id
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // If we found a failed session, return failed immediately
    if (sessionData && sessionData.status === 'failed') {
      return new Response(
        JSON.stringify({
          failed: true,
          message: "Payment previously failed",
          data: {
            isTokenOperation: operationType === 'token_only',
            planType: sessionData.plan_id
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check the subscription status for this user if this is an authenticated request
    if (sessionData?.user_id) {
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', sessionData.user_id)
        .eq('plan_type', sessionData.plan_id)
        .maybeSingle();

      console.log(`[CARDCOM-STATUS] Subscription lookup result:`, { 
        found: !!subscriptionData, 
        status: subscriptionData?.status,
        error: subscriptionError?.message
      });

      // If we found an active subscription, return success
      if (subscriptionData && (subscriptionData.status === 'active' || subscriptionData.status === 'trial')) {
        // Update payment session status if needed
        if (sessionData.status !== 'completed') {
          await supabase
            .from('payment_sessions')
            .update({ status: 'completed' })
            .eq('id', sessionData.id);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription is active",
            data: {
              transactionId: subscriptionData.id,
              isTokenOperation: operationType === 'token_only',
              planType: subscriptionData.plan_type
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // Check if we have any successful payment logs for this user and plan
    if (sessionData?.user_id && sessionData?.plan_id) {
      const { data: paymentLogs, error: logsError } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('user_id', sessionData.user_id)
        .eq('plan_id', sessionData.plan_id)
        .eq('payment_status', 'succeeded')
        .order('created_at', { ascending: false })
        .limit(1);

      console.log(`[CARDCOM-STATUS] Payment logs lookup result:`, { 
        found: !!paymentLogs?.length, 
        error: logsError?.message
      });

      // If we found a successful payment, update the session and return success
      if (paymentLogs && paymentLogs.length > 0) {
        // Update payment session status
        await supabase
          .from('payment_sessions')
          .update({ 
            status: 'completed',
            transaction_id: paymentLogs[0].transaction_id
          })
          .eq('id', sessionData.id);

        // Create or update subscription if needed
        await createOrUpdateSubscription(
          supabase, 
          sessionData.user_id, 
          sessionData.plan_id, 
          paymentLogs[0]
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment found in logs",
            data: {
              transactionId: paymentLogs[0].transaction_id,
              isTokenOperation: operationType === 'token_only',
              planType: sessionData.plan_id
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // For aggressive checking (after consecutive errors), check with CardCom directly
    if (checkType === 'aggressive' || attempt > 10) {
      try {
        // Implementation of direct CardCom check would go here
        // This would require calling CardCom API directly to check transaction status
        console.log('[CARDCOM-STATUS] Performing aggressive check directly with CardCom API');
        
        // For now, we'll return processing to continue with normal checks
        return new Response(
          JSON.stringify({
            processing: true,
            message: "Payment is still processing",
            data: {
              isTokenOperation: operationType === 'token_only'
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } catch (error) {
        console.error('[CARDCOM-STATUS] Error during aggressive check:', error);
      }
    }

    // Last fallback: Check if too many attempts have been made
    if (attempt > 25) {
      return new Response(
        JSON.stringify({
          timeout: true,
          message: "Payment check timed out after too many attempts",
          data: {
            attempts: attempt,
            isTokenOperation: operationType === 'token_only'
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Return processing status to continue checking
    return new Response(
      JSON.stringify({
        processing: true,
        message: "Payment is still processing",
        data: {
          isTokenOperation: operationType === 'token_only'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error checking payment status:", error);
    
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || "Failed to check payment status",
      }),
      {
        status: 200, // Always return 200 to avoid CORS issues
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Helper function to create or update subscription
async function createOrUpdateSubscription(
  supabase: any, 
  userId: string, 
  planType: string, 
  paymentData: any
) {
  try {
    // Calculate subscription parameters based on plan type
    const now = new Date();
    let trialEndsAt = null;
    let nextChargeDate = null;
    let currentPeriodEndsAt = null;
    let status = 'active';

    if (planType === 'monthly') {
      if (paymentData.amount === 0) {
        // This is a trial
        status = 'trial';
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial
        nextChargeDate = new Date(trialEndsAt);
        currentPeriodEndsAt = new Date(trialEndsAt);
        currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
      } else {
        // Regular monthly payment
        currentPeriodEndsAt = new Date(now);
        currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
        nextChargeDate = currentPeriodEndsAt;
      }
    } else if (planType === 'annual') {
      if (paymentData.amount === 0) {
        // This is a trial
        status = 'trial';
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
        nextChargeDate = new Date(trialEndsAt);
        currentPeriodEndsAt = new Date(trialEndsAt);
        currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
      } else {
        // Regular annual payment
        currentPeriodEndsAt = new Date(now);
        currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
        nextChargeDate = currentPeriodEndsAt;
      }
    } else if (planType === 'vip') {
      // VIP plan has no expiry
      currentPeriodEndsAt = null;
      nextChargeDate = null;
    }

    // Extract payment method info from payment data if available
    let paymentMethod = null;
    if (paymentData.payment_data) {
      // Try to extract token information from payment data
      const paymentDataObj = typeof paymentData.payment_data === 'string' 
        ? JSON.parse(paymentData.payment_data) 
        : paymentData.payment_data;
        
      if (paymentDataObj.TokenInfo) {
        paymentMethod = {
          token: paymentDataObj.TokenInfo.Token,
          tokenExpiryDate: paymentDataObj.TokenInfo.TokenExDate,
          lastFourDigits: paymentDataObj.CardNumber5 || paymentDataObj.Last4CardDigits || "0000",
          expiryMonth: paymentDataObj.TokenInfo.CardMonth,
          expiryYear: paymentDataObj.TokenInfo.CardYear
        };
      } else if (paymentDataObj.TranzactionInfo) {
        // Try to extract from transaction info if available
        paymentMethod = {
          token: paymentDataObj.TranzactionInfo.Token || null,
          lastFourDigits: paymentDataObj.TranzactionInfo.Last4CardDigitsString || paymentDataObj.CardNumber5 || "0000",
          expiryMonth: paymentDataObj.TranzactionInfo.CardMonth || null,
          expiryYear: paymentDataObj.TranzactionInfo.CardYear || null
        };
      }
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSubscription) {
      // Update existing subscription
      await supabase
        .from('subscriptions')
        .update({
          plan_type: planType,
          status: status,
          next_charge_date: nextChargeDate,
          trial_ends_at: trialEndsAt,
          current_period_ends_at: currentPeriodEndsAt,
          payment_method: paymentMethod,
          updated_at: now.toISOString()
        })
        .eq('id', existingSubscription.id);
    } else {
      // Create new subscription
      await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          status: status,
          next_charge_date: nextChargeDate,
          trial_ends_at: trialEndsAt,
          current_period_ends_at: currentPeriodEndsAt,
          payment_method: paymentMethod
        });
    }

    console.log(`[CARDCOM-STATUS] Successfully created/updated subscription for user ${userId}, plan ${planType}`);
    return true;
  } catch (error) {
    console.error(`[CARDCOM-STATUS] Error creating/updating subscription:`, error);
    return false;
  }
}
