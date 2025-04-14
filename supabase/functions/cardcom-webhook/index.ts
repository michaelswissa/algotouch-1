
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log('Webhook received from Cardcom');

  try {
    // Get Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse query parameters from URL for GET request or body for POST
    let params: URLSearchParams;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      params = url.searchParams;
    } else {
      // For POST requests, parse the form data
      const formData = await req.formData();
      params = new URLSearchParams();
      
      for (const [key, value] of formData.entries()) {
        params.append(key, value.toString());
      }
    }

    // Log all parameters for debugging
    console.log('Received webhook parameters:');
    for (const [key, value] of params.entries()) {
      console.log(`${key}: ${value}`);
    }

    // Extract important parameters
    const lowProfileId = params.get('ReturnValue') || '';
    const terminalNumber = params.get('TerminalNumber') || '';
    const operationResponse = params.get('OperationResponse') || '';
    const tranzactionId = params.get('TranzactionId') || '';
    const cardOwnerName = params.get('CardOwnerName') || '';
    const cardOwnerEmail = params.get('CardOwnerEmail') || '';
    const responseCode = parseInt(params.get('ResponseCode') || '999');
    const dealResponse = parseInt(params.get('DealResponse') || '999');

    console.log(`Payment webhook for LowProfileId: ${lowProfileId}`);
    console.log(`Response code: ${responseCode}, Operation response: ${operationResponse}`);

    // Check if we've already processed this payment
    const { data: existingPayment } = await supabaseAdmin
      .rpc('check_duplicate_payment', { low_profile_id: lowProfileId });

    if (existingPayment) {
      console.log(`Payment with ID ${lowProfileId} has already been processed. Skipping.`);
      return new Response(
        JSON.stringify({ success: true, message: 'Payment already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the payment session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('payment_details->lowProfileId', lowProfileId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      console.error('Error finding payment session:', sessionError);
      console.log('Session not found for lowProfileId:', lowProfileId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment session not found',
          lowProfileId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('Found payment session:', {
      id: sessionData.id,
      userId: sessionData.user_id,
      planId: sessionData.payment_details?.planId,
      isRegistrationFlow: !!sessionData.payment_details?.isRegistrationFlow
    });

    // Check if payment was successful
    const isSuccess = responseCode === 0 || operationResponse === '0';
    
    // Record payment log regardless of success or failure
    const { error: paymentLogError } = await supabaseAdmin
      .from('user_payment_logs')
      .insert({
        user_id: sessionData.user_id || null,
        status: isSuccess ? 'completed' : 'failed',
        amount: sessionData.payment_details?.amount || 0,
        token: lowProfileId,
        transaction_details: {
          ...params,
          cardOwnerEmail,
          cardOwnerName,
          tranzactionId,
          lowProfileId,
          timestamp: new Date().toISOString(),
          planId: sessionData.payment_details?.planId,
          planName: sessionData.payment_details?.planName,
          isRegistrationFlow: sessionData.payment_details?.isRegistrationFlow
        }
      });

    if (paymentLogError) {
      console.error('Error recording payment log:', paymentLogError);
    }

    // Process successful payment
    if (isSuccess) {
      console.log('Payment successful, processing subscription');

      try {
        // Get plan details from payment session
        const planId = sessionData.payment_details?.planId || 'monthly';
        const isRecurring = sessionData.payment_details?.isRecurring !== false;
        const freeTrialDays = sessionData.payment_details?.freeTrialDays || 0;
        const isRegistrationFlow = sessionData.payment_details?.isRegistrationFlow === true;
        
        // Set up subscription dates
        const now = new Date();
        let trialEndsAt = null;
        let currentPeriodEndsAt = null;
        let status = 'active';
        
        // Calculate trial end date and next charge date
        if (freeTrialDays > 0 && planId !== 'vip') {
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + freeTrialDays);
          status = 'trial';
        }
        
        // Calculate subscription end date based on plan
        if (planId === 'monthly') {
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
        } else if (planId === 'annual') {
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
        }
        
        // For VIP, there is no end date
        
        // Extract payment method details
        const paymentMethod = {
          lastFourDigits: params.get('CardNumber5') || 'xxxx',
          expiryMonth: params.get('Tokef30')?.substring(2, 4) || 'xx',
          expiryYear: params.get('Tokef30')?.substring(0, 2) || 'xx',
          tokenId: params.get('Token') || null
        };

        // Handle registration flow if needed
        let userId = sessionData.user_id;
        
        if (isRegistrationFlow && sessionData.payment_details?.registrationData) {
          console.log('Processing registration flow');
          
          const registrationData = sessionData.payment_details.registrationData;
          
          // Create Supabase auth user
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: registrationData.email,
            password: registrationData.password,
            email_confirm: true,
            user_metadata: {
              first_name: registrationData.userData?.firstName,
              last_name: registrationData.userData?.lastName
            }
          });
          
          if (authError) {
            console.error('Error creating user account:', authError);
            throw new Error(`Failed to create user account: ${authError.message}`);
          }
          
          console.log('User created successfully:', authData.user.id);
          
          // Update the user ID for the subscription
          userId = authData.user.id;
          
          // Create profile
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
              id: userId,
              first_name: registrationData.userData?.firstName,
              last_name: registrationData.userData?.lastName,
              phone: registrationData.userData?.phone,
              email: registrationData.email,
              updated_at: new Date().toISOString()
            });
            
          if (profileError) {
            console.error('Error creating profile:', profileError);
          }
        }
        
        // Create or update subscription
        if (userId) {
          const { error: subsError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
              user_id: userId,
              plan_type: planId,
              status,
              trial_ends_at: trialEndsAt?.toISOString(),
              current_period_ends_at: currentPeriodEndsAt?.toISOString(),
              next_charge_date: trialEndsAt?.toISOString() || currentPeriodEndsAt?.toISOString(),
              payment_method: paymentMethod,
              contract_signed: sessionData.payment_details?.contractId ? true : false,
              contract_signed_at: sessionData.payment_details?.contractId ? now.toISOString() : null
            });
            
          if (subsError) {
            console.error('Error creating subscription:', subsError);
          } else {
            console.log('Subscription created/updated successfully');
          }
          
          // Link contract to user if exists
          if (sessionData.payment_details?.contractId) {
            const { error: contractError } = await supabaseAdmin
              .from('contract_signatures')
              .update({ user_id: userId })
              .eq('id', sessionData.payment_details.contractId)
              .is('user_id', null);
              
            if (contractError) {
              console.error('Error linking contract to user:', contractError);
            }
          }
        }
      } catch (error) {
        console.error('Error processing successful payment:', error);
      }
    }

    // Mark session as processed
    await supabaseAdmin
      .from('payment_sessions')
      .update({
        expires_at: new Date().toISOString(),
        payment_details: {
          ...sessionData.payment_details,
          status: isSuccess ? 'completed' : 'failed',
          processedAt: new Date().toISOString()
        }
      })
      .eq('id', sessionData.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: isSuccess ? 'Payment processed successfully' : 'Payment failed but recorded',
        status: isSuccess ? 'success' : 'failure'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
