
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

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

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Processing cardcom-recurring request');
    
    const { action, subscriptionId } = await req.json();
    
    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'Missing subscriptionId parameter', success: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get the Cardcom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_USERNAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    
    if (!terminalNumber || !apiName || !apiPassword) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get subscription details
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .select('*, payment_tokens(*)')
      .eq('id', subscriptionId)
      .single();
      
    if (subscriptionError || !subscription) {
      throw new Error(`Error fetching subscription: ${subscriptionError?.message || 'Subscription not found'}`);
    }
    
    console.log('Processing subscription:', {
      id: subscription.id,
      userId: subscription.user_id,
      planType: subscription.plan_type,
      status: subscription.status
    });
    
    let result;
    
    switch (action) {
      case 'charge':
        result = await processRecurringCharge(subscription, supabaseClient, terminalNumber, apiName, apiPassword);
        break;
      case 'cancel':
        result = await cancelSubscription(subscription, supabaseClient);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing recurring payment action:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function processRecurringCharge(subscription: any, supabase: any, terminalNumber: string, apiName: string, apiPassword: string) {
  const { user_id, plan_type, payment_method, payment_tokens } = subscription;
  
  // Check if we have a token to charge
  if (!payment_tokens || !payment_tokens.length || !payment_tokens[0].token) {
    throw new Error('No payment token available for recurring charge');
  }
  
  const token = payment_tokens[0].token;
  
  // Determine charge amount based on plan
  let amount = 0;
  if (plan_type === 'monthly') {
    amount = 371; // 371 ILS monthly
  } else if (plan_type === 'annual') {
    amount = 3371; // 3,371 ILS yearly
  } else {
    throw new Error(`Cannot process recurring charge for plan type: ${plan_type}`);
  }
  
  console.log('Processing recurring charge:', {
    userId: user_id,
    planType: plan_type,
    amount,
    token
  });
  
  // Prepare token charge request to Cardcom API
  const chargeRequest = {
    TerminalNumber: Number(terminalNumber),
    UserName: apiName,
    ApiPassword: apiPassword,
    TokenToCharge: {
      Token: token,
      CardValidityMonth: payment_method?.expiryMonth || "12",
      CardValidityYear: payment_method?.expiryYear || "30",
      SumToBill: amount,
      CoinID: 1, // ILS
      ApiLevel: 10,
      IsAutoRecurringPayment: true // Mark as recurring payment
    }
  };
  
  // Call Cardcom API to charge the token
  const response = await fetch("https://secure.cardcom.solutions/interface/ChargeToken.aspx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(chargeRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cardcom API error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const chargeResponse = await response.json();
  
  if (chargeResponse.ResponseCode !== 0) {
    // Record the failed charge
    await supabase
      .from('payment_errors')
      .insert({
        user_id: user_id,
        error_code: chargeResponse.ResponseCode.toString(),
        error_message: chargeResponse.Description,
        payment_details: {
          amount: amount,
          planType: plan_type,
          token: token
        },
        context: 'recurring_charge'
      });
      
    throw new Error(`Cardcom charge error: ${chargeResponse.Description}`);
  }
  
  // Success! Update subscription and record payment
  const now = new Date();
  let nextPeriodEnd = new Date(now);
  let nextChargeDate = new Date(now);
  
  if (plan_type === 'monthly') {
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    nextChargeDate = new Date(nextPeriodEnd);
  } else if (plan_type === 'annual') {
    nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    nextChargeDate = new Date(nextPeriodEnd);
  }
  
  // Update subscription
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      trial_ends_at: null,
      current_period_ends_at: nextPeriodEnd.toISOString(),
      next_charge_date: nextChargeDate.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('id', subscription.id);
    
  if (updateError) {
    console.error('Error updating subscription after charge:', updateError);
  }
  
  // Record the payment
  const { error: paymentError } = await supabase
    .from('payment_history')
    .insert({
      user_id: user_id,
      subscription_id: subscription.id,
      amount: amount,
      currency: 'ILS',
      status: 'completed',
      payment_method: {
        ...payment_method,
        transactionId: chargeResponse.InternalDealNumber,
        approvalNumber: chargeResponse.ApprovalNumber
      },
      payment_date: now.toISOString()
    });
    
  if (paymentError) {
    console.error('Error recording payment history:', paymentError);
  }
  
  return {
    success: true,
    transactionId: chargeResponse.InternalDealNumber,
    amount,
    nextPeriodEnd: nextPeriodEnd.toISOString()
  };
}

async function cancelSubscription(subscription: any, supabase: any) {
  const now = new Date();
  
  // Update subscription status
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('id', subscription.id);
    
  if (updateError) {
    throw new Error(`Error cancelling subscription: ${updateError.message}`);
  }
  
  return {
    success: true,
    cancelled_at: now.toISOString(),
    message: 'Subscription successfully cancelled'
  };
}
