
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    // Parse webhook data from Cardcom
    const payload = await req.json();
    console.log('Received webhook from Cardcom:', payload);

    // Validate required fields
    if (!payload.LowProfileId) {
      throw new Error('Missing LowProfileId in webhook payload');
    }

    // Check if the transaction was successful
    const isSuccess = payload.ResponseCode === 0 || payload.OperationResponse === "0";
    
    if (!isSuccess) {
      console.error('Transaction failed:', payload);
      return new Response(
        JSON.stringify({ success: false, message: 'Transaction failed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Still return 200 to acknowledge receipt
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the payment session associated with this lowProfileId
    const { data: session, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('payment_details->lowProfileId', payload.LowProfileId)
      .maybeSingle();

    if (sessionError || !session) {
      console.error('Error finding payment session:', sessionError || 'Session not found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: sessionError?.message || 'Payment session not found',
          lowProfileId: payload.LowProfileId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Still return 200 to acknowledge receipt
        }
      );
    }

    // Check for duplicate transactions (idempotency)
    const { data: existingPayment } = await supabaseClient.rpc('check_duplicate_payment', {
      low_profile_id: payload.LowProfileId
    });
    
    if (existingPayment) {
      console.log('Payment already processed:', payload.LowProfileId);
      return new Response(
        JSON.stringify({ success: true, message: 'Payment already processed', duplicate: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Extract transaction details
    const transactionInfo = payload.TranzactionInfo || {};
    const amount = session.payment_details?.amount || 0;
    const planType = session.plan_id;
    const userId = session.user_id;

    // Check if it's a token creation or charge
    const isTokenCreation = payload.Operation === "3" || payload.Operation === "CreateTokenOnly";
    const isChargeAndToken = payload.Operation === "2" || payload.Operation === "ChargeAndCreateToken";
    const isChargeOnly = payload.Operation === "1" || payload.Operation === "ChargeOnly";

    // Extract payment method details
    const paymentMethod = {
      lastFourDigits: transactionInfo.Last4CardDigits || transactionInfo.Last4CardDigitsString || '0000',
      cardType: transactionInfo.CardInfo || 'Unknown',
      cardBrand: transactionInfo.Brand || 'Unknown',
      cardholderName: transactionInfo.CardOwnerName || '',
      expiryMonth: transactionInfo.CardMonth || 0,
      expiryYear: transactionInfo.CardYear || 0
    };

    // Record payment log
    const { error: paymentLogError } = await supabaseClient
      .from('user_payment_logs')
      .insert({
        user_id: userId,
        token: payload.LowProfileId,
        amount: amount,
        status: 'completed',
        approval_code: transactionInfo.ApprovalNumber || '',
        transaction_details: transactionInfo
      });

    if (paymentLogError) {
      console.error('Error recording payment log:', paymentLogError);
    }

    // Determine trial period if applicable
    const now = new Date();
    let trialEndsAt = null;
    let nextChargeDate = null;
    let currentPeriodEndsAt = null;

    if (planType === 'monthly' && (isTokenCreation || isChargeAndToken)) {
      // 30-day free trial for monthly subscriptions
      trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);
      nextChargeDate = new Date(trialEndsAt);
      currentPeriodEndsAt = new Date(trialEndsAt);
      currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
    } else if (planType === 'annual' && (isChargeOnly || isChargeAndToken)) {
      // Annual plan - immediate charge, 12 months validity
      nextChargeDate = new Date(now);
      nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
      currentPeriodEndsAt = new Date(nextChargeDate);
    } else if (planType === 'vip' && isChargeOnly) {
      // VIP plan - one-time charge, no recurring payments
      currentPeriodEndsAt = null; // Lifetime access
    }

    // Extract token data if created
    let tokenInfo = null;
    if ((isTokenCreation || isChargeAndToken) && payload.TokenInfo) {
      tokenInfo = payload.TokenInfo;
      
      // Store the payment token
      const { error: tokenError } = await supabaseClient
        .from('payment_tokens')
        .insert({
          user_id: userId,
          token: tokenInfo.Token || '',
          card_last_four: paymentMethod.lastFourDigits,
          card_brand: paymentMethod.cardBrand,
          token_expiry: tokenInfo.TokenExDate ? new Date(tokenInfo.TokenExDate) : null,
          is_active: true
        });
      
      if (tokenError) {
        console.error('Error storing payment token:', tokenError);
      }
    }

    // Update or create subscription
    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_type: planType,
        status: trialEndsAt ? 'trial' : 'active',
        payment_method: paymentMethod,
        trial_ends_at: trialEndsAt?.toISOString() || null,
        next_charge_date: nextChargeDate?.toISOString() || null,
        current_period_ends_at: currentPeriodEndsAt?.toISOString() || null,
        contract_signed: true,
        contract_signed_at: now.toISOString()
      });

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
    }

    // Update session to mark as completed
    await supabaseClient
      .from('payment_sessions')
      .update({
        payment_details: {
          ...session.payment_details,
          status: 'completed',
          completed_at: new Date().toISOString(),
          transaction_id: transactionInfo.TranzactionId || null
        }
      })
      .eq('id', session.id);

    // For annual or VIP plans with immediate payment, record payment history
    if ((planType === 'annual' || planType === 'vip') && (isChargeOnly || isChargeAndToken)) {
      await supabaseClient
        .from('payment_history')
        .insert({
          user_id: userId,
          subscription_id: userId, // Using user ID as subscription ID for now
          amount: amount,
          currency: 'ILS',
          status: 'completed',
          payment_method: paymentMethod
        });
    }

    console.log('Payment processed successfully:', {
      lowProfileId: payload.LowProfileId,
      planType,
      userId,
      isTokenCreation,
      isChargeAndToken,
      isChargeOnly
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
