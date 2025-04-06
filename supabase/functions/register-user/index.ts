
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

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role to create user
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { registrationData, tokenData, contractDetails } = await req.json();

    // Validate required fields
    if (!registrationData?.email || !registrationData?.password) {
      throw new Error('חסרים פרטי התחברות');
    }

    if (!registrationData.userData?.firstName || !registrationData.userData?.lastName) {
      throw new Error('חסרים פרטי משתמש');
    }

    console.log('Starting user registration:', {
      email: registrationData.email,
      firstName: registrationData.userData.firstName,
      planId: registrationData.planId
    });

    // Create the user account
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email: registrationData.email,
      password: registrationData.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: registrationData.userData.firstName,
        last_name: registrationData.userData.lastName,
        registration_complete: true,
        signup_step: 'completed',
        signup_date: new Date().toISOString()
      }
    });

    if (userError) {
      console.error('User creation error:', userError);
      throw userError;
    }

    if (!userData.user) {
      throw new Error('יצירת משתמש נכשלה');
    }

    console.log('User created successfully:', userData.user.id);

    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month trial

    // Create the subscription record
    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: userData.user.id,
        plan_type: registrationData.planId,
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        payment_method: tokenData,
        contract_signed: true,
        contract_signed_at: new Date().toISOString()
      });

    if (subscriptionError) {
      console.error('Subscription error:', subscriptionError);
      throw subscriptionError;
    }

    console.log('Subscription created successfully');

    // Create payment history record
    await supabaseClient.from('payment_history').insert({
      user_id: userData.user.id,
      subscription_id: userData.user.id,
      amount: 0,
      status: 'trial_started',
      payment_method: tokenData
    });

    // Update profile information
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        first_name: registrationData.userData.firstName,
        last_name: registrationData.userData.lastName,
        phone: registrationData.userData.phone
      })
      .eq('id', userData.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Store contract signature if available
    if (contractDetails?.contractHtml && contractDetails?.signature) {
      try {
        // Get client IP address (will be missing in development, that's ok)
        let ipAddress = null;
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
          }
        } catch (e) {
          console.log('Could not get IP address, continuing without it');
        }

        // Store the contract signature
        const { error: signatureError } = await supabaseClient
          .from('contract_signatures')
          .insert({
            user_id: userData.user.id,
            plan_id: registrationData.planId,
            full_name: `${registrationData.userData.firstName} ${registrationData.userData.lastName}`,
            email: registrationData.email,
            phone: registrationData.userData.phone || null,
            signature: contractDetails.signature,
            contract_html: contractDetails.contractHtml,
            ip_address: ipAddress,
            user_agent: contractDetails.browserInfo?.userAgent || navigator.userAgent,
            browser_info: contractDetails.browserInfo || {
              language: navigator.language,
              platform: navigator.platform,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            contract_version: contractDetails.contractVersion || "1.0",
            agreed_to_terms: contractDetails.agreedToTerms || false,
            agreed_to_privacy: contractDetails.agreedToPrivacy || false,
          });

        if (signatureError) {
          console.error('Error storing contract signature:', signatureError);
        } else {
          console.log('Contract signature stored successfully');
        }
      } catch (signatureError) {
        console.error('Exception storing signature:', signatureError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userData.user.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'שגיאה לא ידועה בתהליך ההרשמה' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
