
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
    // Log the incoming webhook
    console.log('Webhook received from Cardcom');
    
    // Parse the webhook data
    let webhookData;
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        webhookData = await req.json();
      } else {
        // For form-urlencoded or other content types
        const formData = await req.formData();
        webhookData = {};
        for (const [key, value] of formData.entries()) {
          webhookData[key] = value;
        }
      }
    } catch (error) {
      console.error('Error parsing webhook data:', error);
      return new Response(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Parsed webhook data:', webhookData);
    
    // Extract lowProfileId from the ReturnValue field
    const lowProfileId = webhookData.ReturnValue || '';
    if (!lowProfileId) {
      throw new Error('Missing ReturnValue (lowProfileId) in webhook data');
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check if the payment was successful
    const isSuccess = webhookData.OperationResponse === '0' || 
        (webhookData.TranzactionInfo && webhookData.TranzactionInfo.ResponseCode === 0);
    
    if (isSuccess) {
      console.log(`Payment successful for lowProfileId: ${lowProfileId}`);
      
      // Look up the payment session
      const { data: paymentSession, error: sessionError } = await supabaseClient
        .from('payment_sessions')
        .select('*')
        .filter('payment_details->lowProfileId', 'eq', lowProfileId)
        .maybeSingle();
      
      if (sessionError) {
        console.error('Error fetching payment session:', sessionError);
      }
      
      // Get plan details
      const planId = paymentSession?.payment_details?.planId || webhookData.planId;
      const userId = paymentSession?.user_id;
      
      // Record the successful payment
      const { error: paymentLogError } = await supabaseClient
        .from('payment_logs')
        .insert({
          lowprofile_id: lowProfileId,
          user_id: userId,
          status: 'completed',
          transaction_id: webhookData.TranzactionInfo?.TranzactionId || webhookData.InternalDealNumber || null,
          plan_id: planId,
          payment_data: webhookData
        })
        .single();
      
      if (paymentLogError) {
        console.error('Error creating payment log:', paymentLogError);
      }
      
      // Update user subscription if a user is associated with the payment
      if (userId && planId) {
        try {
          // Calculate subscription details
          const now = new Date();
          const currentPeriodEndsAt = planId === 'annual'
            ? new Date(now.setFullYear(now.getFullYear() + 1)) // 1 year from now
            : planId === 'monthly'
            ? new Date(now.setMonth(now.getMonth() + 1)) // 1 month from now
            : null; // Lifetime subscription (VIP)
          
          const trialEndsAt = planId === 'monthly'
            ? new Date(now.setDate(now.getDate() + 30)) // 30 days trial
            : null;
          
          const status = planId === 'monthly' ? 'trial' : 'active';
          
          // Update or create subscription
          const { error: subscriptionError } = await supabaseClient
            .from('subscriptions')
            .upsert({
              user_id: userId,
              plan_type: planId,
              status: status,
              trial_ends_at: trialEndsAt?.toISOString() || null,
              current_period_ends_at: currentPeriodEndsAt?.toISOString() || null,
              payment_method: {
                lastFourDigits: webhookData.Last4CardDigits || webhookData.CardNumber5 || '****',
                cardType: webhookData.Mutag_24 || webhookData.ExtShvaParams?.Mutag24 || 'unknown'
              },
              contract_signed: true,
              contract_signed_at: new Date().toISOString()
            });
          
          if (subscriptionError) {
            console.error('Error updating subscription:', subscriptionError);
          }
        } catch (error) {
          console.error('Error updating user subscription:', error);
        }
      }
      
      // Check if there's registration data that needs to be processed
      if (paymentSession?.payment_details?.isRegistrationFlow && 
          paymentSession?.payment_details?.registrationData) {
        
        try {
          console.log('Found registration flow data, processing user registration...');
          // Additional logic for completing registration could be added here
        } catch (error) {
          console.error('Error processing registration data:', error);
        }
      }
    } else {
      console.log(`Payment failed for lowProfileId: ${lowProfileId}`);
      
      // Record the failed payment
      const { error: paymentLogError } = await supabaseClient
        .from('payment_logs')
        .insert({
          lowprofile_id: lowProfileId,
          status: 'failed',
          payment_data: webhookData
        })
        .single();
      
      if (paymentLogError) {
        console.error('Error creating payment log for failed payment:', paymentLogError);
      }
    }
    
    // Acknowledge the webhook
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
