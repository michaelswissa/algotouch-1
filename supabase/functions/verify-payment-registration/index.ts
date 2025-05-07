
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Parse request body
    const { registrationId } = await req.json();
    
    if (!registrationId) {
      throw new Error('Registration ID is required');
    }

    // Retrieve registration data
    const { data, error } = await supabaseClient
      .from('temp_registration_data')
      .select('registration_data, used')
      .eq('id', registrationId)
      .single();
      
    if (error || !data) {
      throw new Error('Registration data not found or expired');
    }
    
    // Check if data was already used
    if (data.used) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Registration already processed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Process registration data
    const registrationData = data.registration_data;
    
    // Mark as used
    await supabaseClient
      .from('temp_registration_data')
      .update({ used: true })
      .eq('id', registrationId);
    
    // If we have all required fields, create user account
    if (registrationData?.email && registrationData?.password) {
      // Create user account
      const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
        email: registrationData.email,
        password: registrationData.password,
        email_confirm: true,
        user_metadata: {
          first_name: registrationData.userData?.firstName || '',
          last_name: registrationData.userData?.lastName || '',
          phone: registrationData.userData?.phone || '',
          registration_complete: true
        }
      });
      
      if (userError) {
        throw userError;
      }
      
      // Create subscription
      if (userData.user && registrationData.planId) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30-day trial
        
        await supabaseClient
          .from('subscriptions')
          .insert({
            user_id: userData.user.id,
            plan_type: registrationData.planId,
            status: 'trial',
            trial_ends_at: trialEndsAt.toISOString(),
            payment_method: registrationData.paymentToken || null,
            contract_signed: registrationData.contractSigned || false,
            contract_signed_at: registrationData.contractSignedAt || null
          });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Payment verified and registration completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error verifying payment registration:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || 'An error occurred while verifying the payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
