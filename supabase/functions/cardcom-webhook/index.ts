
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

// Helper function to log steps with timestamps
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] ${step}${detailsStr}`);
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Cardcom webhook received");

    // Create Supabase client with service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false }
      }
    );

    // Parse webhook payload
    const payload = await req.json();
    logStep("Webhook payload received", { payload });

    // Store the raw webhook for debugging and tracking
    const { data: webhookRecord, error: webhookError } = await supabaseClient
      .from('payment_webhooks')
      .insert({
        webhook_type: 'cardcom',
        payload,
        processed: false,
        processing_attempts: 0
      })
      .select('id')
      .single();

    if (webhookError) {
      logStep("Error storing webhook", { error: webhookError });
      throw new Error(`Failed to store webhook: ${webhookError.message}`);
    }

    logStep("Webhook stored in database", { webhookId: webhookRecord.id });

    // Extract relevant data from the webhook payload
    const {
      LowProfileId,
      ReturnValue,
      TranzactionId,
      ResponseCode,
      TranzactionInfo
    } = payload;

    // Check if payment was successful (ResponseCode 0 means success)
    const isSuccessful = ResponseCode === 0 || (TranzactionInfo && TranzactionInfo.ResponseCode === 0);
    
    if (!isSuccessful) {
      logStep("Payment failed", { ResponseCode, TranzactionInfo });
      await supabaseClient
        .from('payment_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_result: { 
            success: false,
            reason: "Payment failed",
            responseCode: ResponseCode || TranzactionInfo?.ResponseCode
          }
        })
        .eq('id', webhookRecord.id);
      
      return new Response(
        JSON.stringify({ success: false, message: "Payment failed", processed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check for duplicate payment processing
    const { data: existingPayment } = await supabaseClient
      .rpc('check_duplicate_payment_extended', { low_profile_id: LowProfileId });

    if (existingPayment?.exists) {
      logStep("Duplicate payment detected", existingPayment);
      await supabaseClient
        .from('payment_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_result: { 
            success: false,
            reason: "Duplicate payment",
            existingPayment
          }
        })
        .eq('id', webhookRecord.id);
      
      return new Response(
        JSON.stringify({ success: false, message: "Duplicate payment", processed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Extract user ID from ReturnValue (this should be set when creating the payment session)
    const userId = ReturnValue;
    if (!userId) {
      logStep("Missing user ID in ReturnValue", { ReturnValue });
      await supabaseClient
        .from('payment_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_result: { 
            success: false,
            reason: "Missing user ID in ReturnValue"
          }
        })
        .eq('id', webhookRecord.id);
      
      return new Response(
        JSON.stringify({ success: false, message: "Missing user information", processed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Find the active payment session or payment registration
    const { data: paymentSession } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_id', LowProfileId)
      .eq('status', 'initiated')
      .single();

    let planId, amount, paymentDetails;
    
    if (paymentSession) {
      logStep("Found payment session", { paymentSessionId: paymentSession.id });
      planId = paymentSession.plan_id;
      amount = paymentSession.amount;
      
      // Update payment session status
      await supabaseClient
        .from('payment_sessions')
        .update({
          status: 'completed',
          transaction_id: TranzactionId.toString(),
          transaction_data: TranzactionInfo || payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentSession.id);
    } else {
      // If no payment session found, try to extract info from the transaction
      logStep("No payment session found, extracting info from transaction");
      planId = 'monthly'; // Default to monthly if not specified
      amount = TranzactionInfo?.Amount || 0;
    }

    // Record the payment in payment_logs
    const { data: paymentLog, error: paymentLogError } = await supabaseClient
      .from('payment_logs')
      .insert({
        user_id: userId,
        plan_id: planId,
        amount,
        transaction_id: TranzactionId.toString(),
        payment_status: 'completed',
        payment_data: payload,
        currency: 'ILS'
      })
      .select()
      .single();

    if (paymentLogError) {
      logStep("Error recording payment log", { error: paymentLogError });
    } else {
      logStep("Payment log recorded", { paymentLogId: paymentLog.id });
    }

    // Get user details - needed for subscription creation
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Extract payment method details
    let paymentMethod = null;
    if (TranzactionInfo) {
      paymentMethod = {
        cardBrand: TranzactionInfo.Brand || 'Unknown',
        lastFourDigits: TranzactionInfo.Last4CardDigits?.toString() || '****',
        cardMonth: TranzactionInfo.CardMonth,
        cardYear: TranzactionInfo.CardYear
      };
    }

    // Extract token info if present
    let tokenInfo = null;
    if (payload.TokenInfo) {
      tokenInfo = {
        token: payload.TokenInfo.Token,
        expiryDate: payload.TokenInfo.TokenExDate,
        cardMonth: payload.TokenInfo.CardMonth,
        cardYear: payload.TokenInfo.CardYear
      };
    }

    // Create or update subscription record
    const { data: existingSubscription } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    // Calculate subscription periods
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Calculate trial period only for monthly plans
    const isMonthlyPlan = planId === 'monthly';
    const trialEndsAt = isMonthlyPlan ? thirtyDaysFromNow.toISOString() : null;
    const currentPeriodEndsAt = thirtyDaysFromNow.toISOString(); // Default to 30 days for all plans

    // Insert or update subscription
    if (existingSubscription) {
      logStep("Updating existing subscription", { subscriptionId: existingSubscription.id });
      // Update existing subscription
      await supabaseClient
        .from('subscriptions')
        .update({
          plan_type: planId,
          status: isMonthlyPlan ? 'trial' : 'active',
          trial_ends_at: trialEndsAt,
          current_period_ends_at: currentPeriodEndsAt,
          cancelled_at: null,
          payment_method: paymentMethod,
          token: tokenInfo?.token,
          updated_at: now.toISOString()
        })
        .eq('id', existingSubscription.id);
    } else {
      // Create new subscription
      logStep("Creating new subscription", { userId, planType: planId });
      const { data: newSubscription, error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planId,
          status: isMonthlyPlan ? 'trial' : 'active',
          trial_ends_at: trialEndsAt,
          current_period_ends_at: currentPeriodEndsAt,
          payment_method: paymentMethod,
          token: tokenInfo?.token,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .select()
        .single();

      if (subscriptionError) {
        logStep("Error creating subscription", { error: subscriptionError });
      } else {
        logStep("Subscription created", { subscriptionId: newSubscription.id });
      }
    }

    // If token was created, store it in recurring_payments table
    if (tokenInfo) {
      logStep("Processing token info", tokenInfo);
      const { data: tokenRecord, error: tokenError } = await supabaseClient
        .from('recurring_payments')
        .insert({
          user_id: userId,
          token: tokenInfo.token,
          token_expiry: tokenInfo.expiryDate, // Assuming format is YYYYMM
          last_4_digits: TranzactionInfo?.Last4CardDigits?.toString() || '****',
          card_type: TranzactionInfo?.Brand || 'Unknown',
          token_approval_number: tokenInfo.TokenApprovalNumber,
          status: 'active',
          is_valid: true
        })
        .select()
        .single();

      if (tokenError) {
        logStep("Error storing payment token", { error: tokenError });
      } else {
        logStep("Payment token stored", { tokenId: tokenRecord.id });
      }
    }

    // Mark webhook as processed
    await supabaseClient
      .from('payment_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_result: { 
          success: true,
          userId,
          planId,
          transactionId: TranzactionId
        }
      })
      .eq('id', webhookRecord.id);

    logStep("Webhook processing completed successfully");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payment processed successfully",
        processed: true,
        userId,
        planId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in Cardcom webhook handler:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Error processing webhook: ${error.message}`,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
