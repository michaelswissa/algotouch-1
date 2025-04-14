
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
    // Parse the webhook payload
    let payload;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      // Handle URL-encoded form data
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries());
    }
    
    console.log('Received Cardcom webhook payload:', payload);
    
    // Get the low profile ID from the payload
    const lowProfileId = payload.LowProfileId || payload.lowProfileId;
    
    if (!lowProfileId) {
      throw new Error('Missing lowProfileId in webhook payload');
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Check if the payment was successful
    const isSuccessful = 
      (payload.OperationResponse === '0' || payload.OperationResponse === 0) ||
      (payload.ResponseCode === '0' || payload.ResponseCode === 0) || 
      (payload.TranzactionInfo && 
       (payload.TranzactionInfo.ResponseCode === '0' || payload.TranzactionInfo.ResponseCode === 0));
    
    if (isSuccessful) {
      console.log(`Payment successful for lowProfileId: ${lowProfileId}`);
      
      // Check for existing payment log
      const { data: existingPaymentLog } = await supabaseClient
        .from('payment_logs')
        .select('*')
        .eq('lowprofile_id', lowProfileId)
        .single();
      
      // Get associated payment session
      const { data: paymentSession } = await supabaseClient
        .from('payment_sessions')
        .select('*')
        .filter('payment_details->lowProfileId', 'eq', lowProfileId)
        .single();
      
      // Create or update payment log
      if (!existingPaymentLog) {
        await supabaseClient
          .from('payment_logs')
          .insert({
            lowprofile_id: lowProfileId,
            status: 'completed',
            plan_id: paymentSession?.plan_id || null,
            user_id: paymentSession?.user_id || null,
            payment_data: payload,
            transaction_id: payload.TranzactionId || 
                          (payload.TranzactionInfo ? payload.TranzactionInfo.TranzactionId : null)
          });
      } else if (existingPaymentLog.status !== 'completed') {
        await supabaseClient
          .from('payment_logs')
          .update({
            status: 'completed',
            payment_data: payload,
            transaction_id: payload.TranzactionId || 
                          (payload.TranzactionInfo ? payload.TranzactionInfo.TranzactionId : null)
          })
          .eq('id', existingPaymentLog.id);
      }
      
      // If this is part of a registration flow, handle user creation
      if (paymentSession?.payment_details?.isRegistrationFlow && 
          paymentSession?.payment_details?.registrationData) {
        
        console.log('Processing registration flow...');
        // Additional registration logic could be added here
      }
      
      // If associated with a user, update subscription
      if (paymentSession?.user_id) {
        // Check if user has existing subscription
        const { data: existingSubscription } = await supabaseClient
          .from('subscriptions')
          .select('*')
          .eq('user_id', paymentSession.user_id)
          .single();
        
        if (!existingSubscription) {
          // Create new subscription
          const planType = paymentSession.plan_id || 'monthly';
          const now = new Date();
          
          // Set up subscription period based on plan type
          let trialEndsAt = null;
          let currentPeriodEndsAt = null;
          
          if (planType === 'monthly') {
            // Monthly plan with 30-day trial
            trialEndsAt = new Date(now.setDate(now.getDate() + 30)).toISOString();
            currentPeriodEndsAt = trialEndsAt;
          } else if (planType === 'annual') {
            // Annual plan with no trial
            currentPeriodEndsAt = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
          } else if (planType === 'vip') {
            // VIP (lifetime) plan
            currentPeriodEndsAt = new Date(now.setFullYear(now.getFullYear() + 100)).toISOString();
          }
          
          await supabaseClient
            .from('subscriptions')
            .insert({
              user_id: paymentSession.user_id,
              plan_type: planType,
              status: planType === 'monthly' ? 'trial' : 'active',
              trial_ends_at: trialEndsAt,
              current_period_ends_at: currentPeriodEndsAt
            });
        } else {
          // Update existing subscription
          // Implementation would depend on business rules
          console.log('User already has subscription, not updating');
        }
      }
    } else {
      console.log(`Payment failed for lowProfileId: ${lowProfileId}`);
      
      // Update payment log for failed payment
      const { data: existingPaymentLog } = await supabaseClient
        .from('payment_logs')
        .select('*')
        .eq('lowprofile_id', lowProfileId)
        .single();
      
      if (existingPaymentLog) {
        await supabaseClient
          .from('payment_logs')
          .update({
            status: 'failed',
            payment_data: payload
          })
          .eq('id', existingPaymentLog.id);
      } else {
        await supabaseClient
          .from('payment_logs')
          .insert({
            lowprofile_id: lowProfileId,
            status: 'failed',
            payment_data: payload
          });
      }
    }
    
    // Return success response to Cardcom
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
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
