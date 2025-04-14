import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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
  try {
    console.log('Webhook received from Cardcom');
    
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Parse the request body - Cardcom sends data via URL params or request body
    let paymentData;
    
    // Try to get data from query parameters first (GET request)
    const url = new URL(req.url);
    const lowprofileId = url.searchParams.get('ReturnValue');
    
    if (lowprofileId) {
      console.log('Webhook data from query params, lowProfileId:', lowprofileId);
      // Construct data from URL parameters
      paymentData = {
        lowProfileId: lowprofileId,
        operationResponse: url.searchParams.get('OperationResponse') || null,
        dealResponse: url.searchParams.get('DealResponse') || null,
        transactionId: url.searchParams.get('InternalDealNumber') || null,
        cardOwnerName: url.searchParams.get('CardOwnerName') || null,
        cardOwnerEmail: url.searchParams.get('CardOwnerEmail') || null,
        cardOwnerPhone: url.searchParams.get('CardOwnerPhone') || null,
        source: 'url_params',
      };
    } 
    // Otherwise try to get data from request body (POST request)
    else {
      try {
        console.log('Trying to parse webhook data from request body');
        paymentData = await req.json();
        console.log('Webhook data from body:', paymentData);
      } catch (error) {
        console.error('Error parsing webhook body:', error);
        // If JSON parsing fails, try to parse as URL encoded form data
        const formData = await req.formData().catch(() => null);
        if (formData) {
          paymentData = Object.fromEntries(formData.entries());
          console.log('Webhook data from form:', paymentData);
        }
      }
    }

    if (!paymentData) {
      throw new Error('No payment data found in webhook');
    }
    
    // Extract the lowProfileId which we set as ReturnValue when creating the payment
    const lowProfileId = paymentData.lowProfileId || 
                        paymentData.ReturnValue || 
                        paymentData.returnValue;

    if (!lowProfileId) {
      throw new Error('No lowProfileId found in webhook data');
    }

    // Check if the payment was successful
    const isSuccess = 
      (paymentData.OperationResponse === '0') || 
      (paymentData.operationResponse === '0') ||
      (paymentData.ResponseCode === 0) || 
      (paymentData.responseCode === 0);
    
    console.log('Payment success status:', isSuccess);

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the payment session
    const { data: paymentSession, error: paymentSessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .filter('payment_details->lowProfileId', 'eq', lowProfileId)
      .single();
    
    if (paymentSessionError) {
      console.error('Error fetching payment session:', paymentSessionError);
      throw new Error(`Payment session not found for lowProfileId: ${lowProfileId}`);
    }

    console.log('Found payment session:', {
      sessionId: paymentSession.id,
      userId: paymentSession.user_id,
      planId: paymentSession.plan_id,
      hasRegistrationData: !!paymentSession.payment_details?.registrationData
    });

    // Create or update payment log
    const paymentStatus = isSuccess ? 'completed' : 'failed';
    
    const paymentLogData = {
      lowprofile_id: lowProfileId,
      status: paymentStatus,
      plan_id: paymentSession.plan_id,
      user_id: paymentSession.user_id,
      email: paymentSession.email,
      transaction_id: paymentData.transactionId || paymentData.InternalDealNumber || null,
      payment_data: paymentData,
    };

    // Check if we already have a log for this payment
    const { data: existingLog } = await supabaseClient
      .from('payment_logs')
      .select('id')
      .eq('lowprofile_id', lowProfileId)
      .maybeSingle();

    let paymentLog;
    if (existingLog) {
      // Update existing log
      const { data, error } = await supabaseClient
        .from('payment_logs')
        .update(paymentLogData)
        .eq('id', existingLog.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating payment log:', error);
        throw error;
      }
      paymentLog = data;
      console.log('Updated payment log:', paymentLog.id);
    } else {
      // Create new log
      const { data, error } = await supabaseClient
        .from('payment_logs')
        .insert(paymentLogData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating payment log:', error);
        throw error;
      }
      paymentLog = data;
      console.log('Created new payment log:', paymentLog.id);
    }

    // If successful payment, create or update subscription
    if (isSuccess) {
      console.log('Processing successful payment');
      const planId = paymentSession.plan_id;
      let userId = paymentSession.user_id;
      const email = paymentSession.email;
      
      // Check for registration data - this is a registration flow
      if (paymentSession.payment_details?.registrationData && !userId) {
        console.log('Processing registration data');
        const registrationData = paymentSession.payment_details.registrationData;
        
        try {
          // Create the user first
          const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: registrationData.email,
            password: registrationData.password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              full_name: registrationData.firstName + ' ' + registrationData.lastName,
            }
          });
          
          if (authError) {
            console.error('Error creating user during payment webhook:', authError);
            throw authError;
          }
          
          userId = authData.user.id;
          console.log('Created new user:', userId);
          
          // Create user profile
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert({
              id: userId,
              first_name: registrationData.firstName,
              last_name: registrationData.lastName,
              email: registrationData.email,
            });
          
          if (profileError) {
            console.error('Error creating profile during payment webhook:', profileError);
            throw profileError;
          }
          
          // Update payment log with new user ID
          await supabaseClient
            .from('payment_logs')
            .update({ user_id: userId })
            .eq('id', paymentLog.id);
            
          console.log('Updated payment log with user ID');
        } catch (error) {
          console.error('Registration completion error:', error);
        }
      }
      
      // Get subscription plan details
      const plans = {
        monthly: { duration_days: 30, has_trial: true, trial_days: 30 },
        annual: { duration_days: 365, has_trial: true, trial_days: 14 },
        vip: { duration_days: 36500, has_trial: false } // ~100 years (lifetime)
      };
      
      const planDetails = plans[planId as keyof typeof plans] || plans.monthly;
      
      // Calculate subscription dates
      const now = new Date();
      const startDate = now.toISOString();
      
      let endDate = new Date(now);
      if (planDetails.has_trial) {
        endDate.setDate(endDate.getDate() + planDetails.trial_days);
      }
      endDate.setDate(endDate.getDate() + planDetails.duration_days);
      
      // Check for existing subscription
      const { data: existingSubscription } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      const subscriptionData = {
        user_id: userId,
        email: email,
        plan_type: planId,
        status: planDetails.has_trial ? 'trial' : 'active',
        start_date: startDate,
        end_date: endDate.toISOString(),
        payment_id: paymentLog.id,
        trial_ends_at: planDetails.has_trial ? endDate.toISOString() : null,
        metadata: {
          transaction_id: paymentData.transactionId || paymentData.InternalDealNumber || null,
          payment_method: 'credit_card'
        }
      };
      
      if (existingSubscription) {
        console.log('Updating existing subscription:', existingSubscription.id);
        await supabaseClient
          .from('subscriptions')
          .update(subscriptionData)
          .eq('id', existingSubscription.id);
      } else {
        console.log('Creating new subscription');
        await supabaseClient
          .from('subscriptions')
          .insert(subscriptionData);
      }
    }

    // Return a successful response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        paymentStatus,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Return an error response but with 200 status so Cardcom doesn't retry
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Always return 200 to Cardcom, even on error
      }
    );
  }
});
