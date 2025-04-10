
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  try {
    console.log('Webhook called with URL:', req.url);
    
    // Get URL parameters from Cardcom callback
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    
    console.log('Received webhook from Cardcom', {
      operationResponse: params.OperationResponse,
      lowProfileId: params.LowProfileCode,
      dealResponse: params.DealResponse,
      fullParams: params
    });

    // Initialize Supabase client with service role key (needs admin access)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check if payment was successful
    if (params.OperationResponse === '0') {
      // Get the transaction details
      const transactionId = params.InternalDealNumber;
      const planId = params.ReturnValue;
      
      console.log(`Payment successful - Plan: ${planId}, Transaction: ${transactionId}`);

      // Check for any pending registration data
      const { data: registrationData } = await supabaseAdmin
        .from('temp_registration_data')
        .select('*')
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (registrationData) {
        await processRegistrationPayment(supabaseAdmin, registrationData, planId, transactionId, params);
      } else {
        console.log('No registration data found, assuming authenticated user payment');
        // Handle standard authenticated payment - no need to do anything here
        // as the frontend will update the subscription record
      }
    } else {
      console.error('Payment failed', params);
      // Log the error but still return OK to acknowledge receipt
    }

    // We always return OK to Cardcom to acknowledge the webhook
    // even if we had errors processing it
    return new Response('OK', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // We still return OK to Cardcom, but log the error
    return new Response('OK', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  }
});

async function processRegistrationPayment(
  supabaseAdmin: any,
  registrationData: any,
  planId: string,
  transactionId: string,
  params: Record<string, string>
) {
  try {
    console.log('Processing registration payment with data');

    const userData = registrationData.registration_data;
    
    if (!userData || !userData.email || !userData.password) {
      throw new Error('Invalid registration data');
    }

    // Create the user account using admin privileges
    const { data: authData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        first_name: userData.userData?.firstName || '',
        last_name: userData.userData?.lastName || '',
        registration_complete: true,
        signup_step: 'completed',
        signup_date: new Date().toISOString(),
        plan_id: planId
      }
    });
    
    if (userError) {
      throw new Error(`Failed to create user: ${userError.message}`);
    }
    
    const userId = authData.user.id;
    
    // Add a delay to ensure the user is created before proceeding
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const now = new Date();
    let periodEndsAt = null;
    let trialEndsAt = null;
    let status = 'active';
    
    if (planId === 'monthly') {
      trialEndsAt = new Date(now);
      trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
      status = 'trial';
    } else if (planId === 'annual') {
      periodEndsAt = new Date(now);
      periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
    }
    
    // Create the subscription record
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: planId,
        status: status,
        trial_ends_at: trialEndsAt?.toISOString() || null,
        current_period_ends_at: periodEndsAt?.toISOString() || null,
        payment_method: {
          type: 'card',
          provider: 'cardcom',
          last_transaction_id: transactionId
        },
        contract_signed: Boolean(userData.contractSigned),
        contract_signed_at: userData.contractSignedAt || now.toISOString()
      });
    
    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
    }
    
    // Create payment history record
    const amount = planId === 'monthly' ? 99 : planId === 'annual' ? 899 : 3499;
    await supabaseAdmin.from('payment_history').insert({
      user_id: userId,
      subscription_id: userId,
      amount: amount,
      status: 'completed',
      currency: 'ILS',
      provider: 'cardcom',
      transaction_id: transactionId,
      payment_method: {
        type: 'card',
        provider: 'cardcom'
      }
    });
    
    // Store contract signature if available
    if (userData.contractDetails && userData.contractDetails.contractHtml && userData.contractDetails.signature) {
      await supabaseAdmin
        .from('contract_signatures')
        .insert({
          user_id: userId,
          plan_id: planId,
          full_name: `${userData.userData?.firstName || ''} ${userData.userData?.lastName || ''}`,
          email: userData.email,
          phone: userData.userData?.phone || null,
          signature: userData.contractDetails.signature,
          contract_html: userData.contractDetails.contractHtml,
          user_agent: userData.contractDetails.browserInfo?.userAgent || null,
          browser_info: userData.contractDetails.browserInfo || null,
          contract_version: userData.contractDetails.contractVersion || "1.0",
          agreed_to_terms: userData.contractDetails.agreedToTerms || false,
          agreed_to_privacy: userData.contractDetails.agreedToPrivacy || false,
        });
    }
    
    // Update profile information
    await supabaseAdmin
      .from('profiles')
      .update({
        first_name: userData.userData?.firstName || null,
        last_name: userData.userData?.lastName || null,
        phone: userData.userData?.phone || null
      })
      .eq('id', userId);
    
    // Mark the registration data as used
    await supabaseAdmin
      .from('temp_registration_data')
      .update({ used: true })
      .eq('id', registrationData.id);
    
    console.log('Successfully processed registration payment for user:', userId);
    return true;
    
  } catch (error) {
    console.error('Error processing registration payment:', error);
    return false;
  }
}
