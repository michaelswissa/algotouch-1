
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
    const webhookData = await req.json();
    console.log('Received webhook data from Cardcom:', webhookData);
    
    // Extract the lowProfileId from the webhook data
    const lowProfileId = webhookData.LowProfileId;
    if (!lowProfileId) {
      throw new Error('Missing LowProfileId in webhook data');
    }

    // Check if payment was successful
    const isPaymentSuccessful = 
      webhookData.OperationResponse === "0" || 
      (webhookData.TranzactionInfo && webhookData.TranzactionInfo.ResponseCode === 0);
    
    if (!isPaymentSuccessful) {
      console.log('Payment was unsuccessful', {
        lowProfileId,
        responseCode: webhookData.OperationResponse || webhookData.TranzactionInfo?.ResponseCode,
        description: webhookData.Description || webhookData.TranzactionInfo?.Description
      });
      
      // Handle failed payment - log but don't throw error
      return new Response(
        JSON.stringify({ success: false, message: 'Payment unsuccessful' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Return 200 to acknowledge receipt
        }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the payment session
    const { data: session, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('payment_details->lowProfileId', lowProfileId)
      .single();

    if (sessionError || !session) {
      console.error('Error retrieving payment session:', sessionError);
      throw new Error('Payment session not found');
    }

    console.log('Found payment session:', session);

    // Extract transaction details
    const transactionId = webhookData.TranzactionId || webhookData.TranzactionInfo?.TranzactionId;
    const approvalNumber = 
      webhookData.TranzactionInfo?.ApprovalNumber || 
      webhookData.TokenInfo?.TokenApprovalNumber || 
      '';

    // Extract payment method details for subscription
    let paymentMethod = {};

    if (webhookData.TokenInfo) {
      // Extract token for recurring payments
      paymentMethod = {
        token: webhookData.TokenInfo.Token,
        tokenExpiryDate: webhookData.TokenInfo.TokenExDate,
        lastFourDigits: webhookData.TranzactionInfo?.Last4CardDigits?.toString() || 
                        webhookData.TranzactionInfo?.Last4CardDigitsString || '',
        cardHolderName: webhookData.UIValues?.CardOwnerName || '',
        cardHolderEmail: webhookData.UIValues?.CardOwnerEmail || '',
        cardHolderPhone: webhookData.UIValues?.CardOwnerPhone || ''
      };
    } else if (webhookData.TranzactionInfo) {
      // Extract card details for one-time payments
      paymentMethod = {
        lastFourDigits: webhookData.TranzactionInfo.Last4CardDigits?.toString() || 
                        webhookData.TranzactionInfo.Last4CardDigitsString || '',
        cardHolderName: webhookData.UIValues?.CardOwnerName || 
                        webhookData.TranzactionInfo.CardOwnerName || '',
        cardBrand: webhookData.TranzactionInfo.Brand || '',
        approvalNumber
      };
    }

    // Update the payment session with transaction details
    await supabaseClient
      .from('payment_sessions')
      .update({
        payment_details: {
          ...session.payment_details,
          status: 'completed',
          completed_at: new Date().toISOString(),
          transaction_id: transactionId,
          approval_number: approvalNumber,
          payment_method: paymentMethod
        }
      })
      .eq('id', session.id);

    // Log the payment in user_payment_logs
    await supabaseClient
      .from('user_payment_logs')
      .insert({
        user_id: session.user_id || null,
        token: lowProfileId,
        amount: session.payment_details.amount || 0,
        approval_code: approvalNumber,
        status: 'completed',
        transaction_details: webhookData
      });

    // Process the payment based on session information
    // Handle both logged-in users and registration flow
    if (session.user_id) {
      // Case 1: User is logged in
      await processExistingUserPayment(supabaseClient, session, webhookData, paymentMethod);
    } else if (session.payment_details.registrationData) {
      // Case 2: Registration flow
      await processNewUserRegistration(supabaseClient, session, webhookData, paymentMethod);
    } else {
      console.error('Invalid session state - no user_id or registration data');
    }

    return new Response(
      JSON.stringify({ success: true }),
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

async function processExistingUserPayment(supabaseClient, session, webhookData, paymentMethod) {
  try {
    const userId = session.user_id;
    const planId = session.plan_id;
    const planDetails = session.payment_details;
    const now = new Date();
    
    // Determine subscription type and end dates
    let periodEndsAt = null;
    let trialEndsAt = null;
    let status = 'active';
    
    if (planId === 'monthly') {
      if (planDetails.freeTrialDays && planDetails.freeTrialDays > 0) {
        status = 'trial';
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + planDetails.freeTrialDays);
        
        // Set next charge date to after trial period
        periodEndsAt = new Date(trialEndsAt);
        periodEndsAt.setMonth(periodEndsAt.getMonth() + 1);
      } else {
        // Regular monthly subscription
        periodEndsAt = new Date(now);
        periodEndsAt.setMonth(periodEndsAt.getMonth() + 1);
      }
    } else if (planId === 'annual') {
      periodEndsAt = new Date(now);
      periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
    } else if (planId === 'vip') {
      // VIP is lifetime, no end date
      status = 'active';
    }
    
    // Save or update subscription
    const { data: existingSubscription, error: findError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (findError) {
      console.error('Error finding subscription:', findError);
      throw findError;
    }
    
    if (existingSubscription) {
      // Update existing subscription
      await supabaseClient
        .from('subscriptions')
        .update({
          plan_type: planId,
          status: status,
          payment_method: paymentMethod,
          trial_ends_at: trialEndsAt?.toISOString() || null,
          current_period_ends_at: periodEndsAt?.toISOString() || null,
          next_charge_date: periodEndsAt?.toISOString() || null,
          updated_at: now.toISOString(),
          cancelled_at: null, // Clear cancelled status if user is resubscribing
        })
        .eq('id', existingSubscription.id);
    } else {
      // Create new subscription
      await supabaseClient
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planId,
          status: status,
          payment_method: paymentMethod,
          trial_ends_at: trialEndsAt?.toISOString() || null,
          current_period_ends_at: periodEndsAt?.toISOString() || null,
          next_charge_date: periodEndsAt?.toISOString() || null,
          contract_signed: true,
          contract_signed_at: now.toISOString()
        });
    }
    
    // Record payment in payment_history
    // Skip if it's a free trial with no charge
    if (planId !== 'monthly' || status !== 'trial') {
      await supabaseClient
        .from('payment_history')
        .insert({
          user_id: userId,
          subscription_id: existingSubscription?.id || userId, // Use subscription ID if available
          amount: planDetails.amount || 0,
          currency: 'ILS',
          status: 'completed',
          payment_method: paymentMethod,
          payment_date: now.toISOString()
        });
    }

    console.log('Successfully processed payment for existing user:', userId);
    return true;
  } catch (error) {
    console.error('Error processing existing user payment:', error);
    throw error;
  }
}

async function processNewUserRegistration(supabaseClient, session, webhookData, paymentMethod) {
  try {
    const registrationData = session.payment_details.registrationData;
    const planId = session.plan_id;
    const planDetails = session.payment_details;
    const userEmail = session.email || registrationData.email;
    
    console.log('Processing new user registration with payment:', { 
      planId, 
      email: userEmail 
    });
    
    if (!registrationData || !userEmail) {
      throw new Error('Missing registration data');
    }
    
    // Create the user account
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email: userEmail,
      password: registrationData.password,
      email_confirm: true, // Auto-confirm email for better UX
      user_metadata: {
        first_name: registrationData.userData.firstName,
        last_name: registrationData.userData.lastName,
        registration_complete: true,
        signup_step: 'completed',
        signup_date: new Date().toISOString()
      }
    });
    
    if (userError) {
      console.error('Error creating user:', userError);
      throw userError;
    }
    
    if (!userData.user) {
      throw new Error('Failed to create user account');
    }
    
    const userId = userData.user.id;
    console.log('User created successfully:', userId);
    
    // Set up dates based on plan type
    const now = new Date();
    let periodEndsAt = null;
    let trialEndsAt = null;
    let status = 'active';
    
    if (planId === 'monthly') {
      if (planDetails.freeTrialDays && planDetails.freeTrialDays > 0) {
        status = 'trial';
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + planDetails.freeTrialDays);
        
        // Set next charge date to after trial period
        periodEndsAt = new Date(trialEndsAt);
        periodEndsAt.setMonth(periodEndsAt.getMonth() + 1);
      } else {
        // Regular monthly subscription
        periodEndsAt = new Date(now);
        periodEndsAt.setMonth(periodEndsAt.getMonth() + 1);
      }
    } else if (planId === 'annual') {
      periodEndsAt = new Date(now);
      periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
    } else if (planId === 'vip') {
      // VIP is lifetime, no end date
      status = 'active';
    }
    
    // Create subscription record
    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: planId,
        status: status,
        payment_method: paymentMethod,
        trial_ends_at: trialEndsAt?.toISOString() || null,
        current_period_ends_at: periodEndsAt?.toISOString() || null,
        next_charge_date: periodEndsAt?.toISOString() || null,
        contract_signed: true,
        contract_signed_at: now.toISOString()
      });
    
    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      throw subscriptionError;
    }
    
    // Record payment history
    // Skip if it's a free trial with no charge
    if (planId !== 'monthly' || status !== 'trial') {
      await supabaseClient
        .from('payment_history')
        .insert({
          user_id: userId,
          subscription_id: userId,
          amount: planDetails.amount || 0,
          currency: 'ILS',
          status: 'completed',
          payment_method: paymentMethod,
          payment_date: now.toISOString()
        });
    } else {
      // Record trial started
      await supabaseClient
        .from('payment_history')
        .insert({
          user_id: userId,
          subscription_id: userId,
          amount: 0,
          currency: 'ILS',
          status: 'trial_started',
          payment_method: paymentMethod,
          payment_date: now.toISOString()
        });
    }

    // Update profile information
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        first_name: registrationData.userData.firstName,
        last_name: registrationData.userData.lastName,
        phone: registrationData.userData.phone || null
      })
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Non-critical error, don't throw
    }

    // Update payment session with created user_id
    await supabaseClient
      .from('payment_sessions')
      .update({ user_id: userId })
      .eq('id', session.id);
    
    console.log('Successfully processed registration and payment for new user:', userId);
    return true;
  } catch (error) {
    console.error('Error processing registration with payment:', error);
    throw error;
  }
}
