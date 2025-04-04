import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // For GET requests (typical for payment provider callbacks)
    const url = new URL(req.url);
    const params = url.searchParams;

    // Log all parameters for debugging
    console.log('Received Cardcom callback with params:', Object.fromEntries(params.entries()));

    // Get essential parameters
    const userId = params.get('userId');
    const planId = params.get('planId');
    const transactionId = params.get('transactionId');
    const status = params.get('status');
    const amount = params.get('amount');
    const terminalNumber = params.get('terminalNumber');
    
    // Other potential parameters
    const cardLastDigits = params.get('cardLastDigits');
    const cardExpiration = params.get('cardExpiration');
    const cardToken = params.get('cardToken');

    if (!userId || !status) {
      console.error('Missing required parameters');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process the payment based on status
    if (status === 'success' || status === 'approved') {
      // Create payment record
      const paymentData = {
        user_id: userId,
        subscription_id: userId, // Using userId as subscription_id for now
        amount: amount ? parseFloat(amount) : 0,
        currency: 'ILS',
        status: 'completed',
        payment_method: {
          provider: 'cardcom',
          transactionId,
          terminalNumber,
          lastFourDigits: cardLastDigits,
          cardToken: cardToken,
          expiryDate: cardExpiration
        }
      };

      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert(paymentData);

      if (paymentError) {
        console.error('Error recording payment:', paymentError);
      } else {
        console.log('Payment recorded successfully');
      }

      // Update subscription
      const now = new Date();
      let updatedSubscriptionData: any = {
        plan_type: planId,
        status: 'active',
        payment_method: {
          provider: 'cardcom',
          lastFourDigits: cardLastDigits,
          expiryMonth: cardExpiration ? cardExpiration.split('/')[0] : null,
          expiryYear: cardExpiration ? cardExpiration.split('/')[1] : null,
          cardToken: cardToken,
        }
      };

      // Set subscription period based on plan
      if (planId === 'monthly') {
        const periodEndsAt = new Date(now);
        periodEndsAt.setMonth(periodEndsAt.getMonth() + 1);
        updatedSubscriptionData.current_period_ends_at = periodEndsAt.toISOString();
        updatedSubscriptionData.trial_ends_at = null;
      } else if (planId === 'annual') {
        const periodEndsAt = new Date(now);
        periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
        updatedSubscriptionData.current_period_ends_at = periodEndsAt.toISOString();
        updatedSubscriptionData.trial_ends_at = null;
      } else if (planId === 'vip') {
        // VIP plan has no end date
        updatedSubscriptionData.current_period_ends_at = null;
        updatedSubscriptionData.trial_ends_at = null;
      }

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          ...updatedSubscriptionData
        });

      if (subscriptionError) {
        console.error('Error updating subscription:', subscriptionError);
      } else {
        console.log('Subscription updated successfully');
      }

      // Return success response
      return new Response(
        JSON.stringify({ success: true, message: 'Payment processed successfully' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Handle failed payment
      console.warn('Payment failed with status:', status);
      
      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert({
          user_id: userId,
          subscription_id: userId,
          amount: amount ? parseFloat(amount) : 0,
          currency: 'ILS',
          status: 'failed',
          payment_method: {
            provider: 'cardcom',
            transactionId,
            terminalNumber,
            failureReason: status
          }
        });

      if (paymentError) {
        console.error('Error recording failed payment:', paymentError);
      }

      return new Response(
        JSON.stringify({ success: false, message: 'Payment failed', status }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error processing payment callback:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
