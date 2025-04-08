
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

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

const DEFAULT_GRACE_PERIOD_DAYS = 7;

// Create a new edge function to monitor payments and send notifications
serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get function parameters
    const { action, userId, failureReason } = await req.json();
    
    // Initialize response
    let responseData: any = { success: false };
    
    // Handle different actions
    switch (action) {
      case 'handle-payment-failure':
        if (!userId || !failureReason) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required parameters' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        
        responseData = await handlePaymentFailure(supabase, userId, failureReason);
        break;
        
      case 'check-subscriptions':
        // This can be scheduled to run periodically
        responseData = await checkExpiredSubscriptions(supabase);
        break;
        
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in payment monitor:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Function to handle payment failures
async function handlePaymentFailure(supabase: any, userId: string, failureReason: string) {
  try {
    const now = new Date().toISOString();
    
    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (subError) throw subError;
    if (!subscription) return { success: false, error: 'Subscription not found' };
    
    // Calculate grace period end date
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + DEFAULT_GRACE_PERIOD_DAYS);
    
    // Update payment method with failure info
    const paymentMethod = {
      ...(subscription.payment_method || {}),
      payment_failed: true,
      last_payment_failure: {
        date: now,
        reason: failureReason,
        grace_period_end: gracePeriodEnd.toISOString()
      }
    };
    
    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'failed',
        payment_method: paymentMethod
      })
      .eq('id', subscription.id);
      
    if (error) throw error;
    
    // Log payment failure to history
    await supabase.from('payment_history').insert({
      user_id: userId,
      subscription_id: subscription.id,
      amount: 0,
      status: 'failed',
      currency: 'ILS',
      payment_method: paymentMethod
    });
    
    // Get user email for notification
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) throw userError;
    
    // TODO: Send email notification to user about payment failure
    console.log(`Payment failure for user ${userData?.user?.email}: ${failureReason}`);
    
    return {
      success: true,
      message: 'Payment failure handled successfully',
      gracePeriodEnd: gracePeriodEnd.toISOString()
    };
  } catch (error) {
    console.error('Error handling payment failure:', error);
    return { success: false, error: error.message };
  }
}

// Function to check for expired subscriptions and grace periods
async function checkExpiredSubscriptions(supabase: any) {
  try {
    const now = new Date().toISOString();
    
    // Find subscriptions with expired trials
    const { data: expiredTrials, error: trialError } = await supabase
      .from('subscriptions')
      .select('id, user_id, payment_method')
      .eq('status', 'trial')
      .lt('trial_ends_at', now);
      
    if (trialError) throw trialError;
    
    // Process expired trials
    for (const subscription of expiredTrials || []) {
      if (!subscription.payment_method) {
        // No payment method saved, subscription should expire
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', subscription.id);
          
        // TODO: Send notification to user about expired trial
      } else {
        // Has payment method, convert to active subscription
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'active',
            trial_ends_at: null,
            current_period_ends_at: new Date(Date.now() + 30 * 86400000).toISOString() // 30 days
          })
          .eq('id', subscription.id);
          
        // TODO: Process first payment
      }
    }
    
    // Check for failed payments with expired grace periods
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id, payment_method')
      .eq('status', 'failed');
      
    if (subError) throw subError;
    
    let expiredCount = 0;
    
    // Process subscriptions with expired grace periods
    for (const subscription of subscriptions || []) {
      const paymentFailure = subscription.payment_method?.last_payment_failure;
      
      if (paymentFailure && paymentFailure.grace_period_end) {
        const gracePeriodEnd = new Date(paymentFailure.grace_period_end);
        
        if (new Date() > gracePeriodEnd) {
          // Grace period expired, update to expired status
          await supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('id', subscription.id);
            
          expiredCount++;
          
          // TODO: Send notification about expired subscription
        }
      }
    }
    
    return {
      success: true,
      expiredTrials: expiredTrials?.length || 0,
      expiredGracePeriods: expiredCount
    };
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    return { success: false, error: error.message };
  }
}
