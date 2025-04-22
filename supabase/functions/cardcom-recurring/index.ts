
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  // Create Supabase admin client for database operations that bypass RLS
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, subscriptionId, userId } = await req.json();
    logStep("Received request", { action, subscriptionId, userId });

    if (action === 'cancel') {
      return await handleCancelSubscription(supabaseAdmin, subscriptionId);
    } else if (action === 'process-pending-payments') {
      return await handlePendingPayments(supabaseAdmin);
    } else if (action === 'check-monthly-payments') {
      return await processDuePayments(supabaseAdmin);
    } else {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    logStep("ERROR", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCancelSubscription(supabaseAdmin, subscriptionId) {
  logStep("Cancelling subscription", { subscriptionId });
  
  // Get subscription details
  const { data: subscription, error: fetchError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();

  if (fetchError || !subscription) {
    logStep("Fetch error", fetchError);
    throw new Error("Could not find subscription");
  }

  // Update subscription to cancelled status
  const { error: updateError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId);

  if (updateError) {
    logStep("Update error", updateError);
    throw new Error("Failed to cancel subscription");
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Subscription cancelled successfully"
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handlePendingPayments(supabaseAdmin) {
  logStep("Processing pending first payments");

  // Find subscriptions that need their first payment processed
  const today = new Date().toISOString();
  
  const { data: pendingSubscriptions, error: fetchError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .eq('first_payment_processed', false)
    .lte('next_charge_date', today);

  if (fetchError) {
    logStep("Error fetching pending subscriptions", fetchError);
    throw new Error("Failed to fetch pending subscriptions");
  }

  logStep(`Found ${pendingSubscriptions?.length || 0} pending first payments`);

  if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "No pending payments to process" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Process each pending payment
  const results = await Promise.all(
    pendingSubscriptions.map(async (subscription) => {
      try {
        return await processSubscriptionPayment(supabaseAdmin, subscription);
      } catch (error) {
        logStep("Error processing subscription payment", { subscriptionId: subscription.id, error: error.message });
        return { id: subscription.id, success: false, error: error.message };
      }
    })
  );

  return new Response(
    JSON.stringify({ success: true, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processDuePayments(supabaseAdmin) {
  logStep("Processing due monthly payments");

  // Find active subscriptions that need to be charged today
  const today = new Date().toISOString();
  
  const { data: dueSubscriptions, error: fetchError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .lte('next_charge_date', today);

  if (fetchError) {
    logStep("Error fetching due subscriptions", fetchError);
    throw new Error("Failed to fetch due subscriptions");
  }

  logStep(`Found ${dueSubscriptions?.length || 0} due payments`);

  if (!dueSubscriptions || dueSubscriptions.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "No due payments to process" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Process each due payment
  const results = await Promise.all(
    dueSubscriptions.map(async (subscription) => {
      try {
        return await processSubscriptionPayment(supabaseAdmin, subscription);
      } catch (error) {
        logStep("Error processing subscription payment", { subscriptionId: subscription.id, error: error.message });
        return { id: subscription.id, success: false, error: error.message };
      }
    })
  );

  return new Response(
    JSON.stringify({ success: true, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processSubscriptionPayment(supabaseAdmin, subscription) {
  logStep("Processing payment for subscription", { id: subscription.id, plan: subscription.plan_type });
  
  const CARDCOM_CONFIG = {
    terminalNumber: Deno.env.get('CARDCOM_TERMINAL_NUMBER'),
    apiName: Deno.env.get('CARDCOM_API_NAME'),
    apiPassword: Deno.env.get('CARDCOM_API_PASSWORD')
  };
  
  if (!CARDCOM_CONFIG.terminalNumber || !CARDCOM_CONFIG.apiName || !CARDCOM_CONFIG.apiPassword) {
    throw new Error("Missing CardCom configuration");
  }

  // Get payment amount based on plan type
  let amount = 371; // Default monthly amount
  if (subscription.plan_type === 'annual') {
    amount = 3371;
  } else if (subscription.plan_type === 'vip') {
    amount = 13121;
  }

  // Process payment with CardCom API using the token
  const paymentToken = subscription.payment_token;
  if (!paymentToken) {
    throw new Error("Missing payment token");
  }

  // Send request to CardCom to charge the token
  const cardcomPayload = {
    TerminalNumber: CARDCOM_CONFIG.terminalNumber,
    ApiName: CARDCOM_CONFIG.apiName,
    ApiPassword: CARDCOM_CONFIG.apiPassword,
    Token: paymentToken,
    Amount: amount,
    ExternalUniqTranId: `sub-${subscription.id}-${Date.now()}`,
    CardOwnerInformation: {
      CardOwnerEmail: subscription.user_email || ""
    }
  };

  logStep("Sending payment request to CardCom", { payload: cardcomPayload });

  const response = await fetch("https://secure.cardcom.solutions/api/v11/Transactions/Transaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cardcomPayload),
  });

  const responseData = await response.json();
  logStep("CardCom payment response", responseData);

  if (responseData.ResponseCode !== 0) {
    // Payment failed
    await supabaseAdmin.from('payment_errors').insert({
      user_id: subscription.user_id,
      error_code: responseData.ResponseCode.toString(),
      error_message: responseData.Description,
      request_data: cardcomPayload,
      response_data: responseData
    });

    // Update subscription status if multiple failures
    if (subscription.payment_failures >= 2) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'payment_failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    } else {
      // Increment failure count and set next retry
      await supabaseAdmin
        .from('subscriptions')
        .update({
          payment_failures: (subscription.payment_failures || 0) + 1,
          next_charge_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Try again tomorrow
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    }

    throw new Error(`Payment failed: ${responseData.Description}`);
  }

  // Payment successful
  await supabaseAdmin.from('user_payment_logs').insert({
    user_id: subscription.user_id,
    subscription_id: subscription.id,
    token: paymentToken,
    amount: amount,
    status: 'success',
    transaction_id: responseData.TranzactionId,
    payment_data: responseData
  });

  // Calculate next charge date (30 days from now for monthly, 365 for annual)
  let nextChargeDate = new Date();
  if (subscription.plan_type === 'monthly') {
    nextChargeDate.setDate(nextChargeDate.getDate() + 30);
  } else if (subscription.plan_type === 'annual') {
    nextChargeDate.setDate(nextChargeDate.getDate() + 365);
  }

  // Update subscription with new payment date and mark first payment as processed
  await supabaseAdmin
    .from('subscriptions')
    .update({
      first_payment_processed: true,
      payment_failures: 0,
      next_charge_date: nextChargeDate.toISOString(),
      current_period_ends_at: nextChargeDate.toISOString(),
      updated_at: new Date().toISOString(),
      payment_status: 'succeeded',
      payment_method: {
        lastFourDigits: responseData.Last4CardDigits?.toString() || '',
        expiryMonth: responseData.CardMonth?.toString() || '',
        expiryYear: responseData.CardYear?.toString() || ''
      }
    })
    .eq('id', subscription.id);

  return { 
    id: subscription.id, 
    success: true, 
    transactionId: responseData.TranzactionId,
    nextChargeDate: nextChargeDate.toISOString()
  };
}
