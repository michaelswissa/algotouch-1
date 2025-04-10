
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Parse webhook data
    const webhookData = await req.json();
    console.log('Received Cardcom webhook data:', JSON.stringify(webhookData));

    // Check if the transaction was successful
    if (webhookData.ResponseCode !== 0) {
      console.error('Transaction failed:', webhookData.Description);
      return new Response(
        JSON.stringify({ success: false, error: webhookData.Description }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Still return 200 to acknowledge receipt
        }
      );
    }

    // Transaction was successful, process it
    console.log('Processing successful transaction:', webhookData.TranzactionInfo?.TranzactionId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is for a registration (ReturnValue should contain the plan ID)
    const planId = webhookData.ReturnValue;
    
    if (!planId) {
      console.warn('No plan ID found in ReturnValue');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing plan ID' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Still return 200 to acknowledge receipt
        }
      );
    }

    // Check if we have registration data stored for this transaction
    const { data: registrationData, error: fetchError } = await supabase
      .from('temp_registration_data')
      .select('*')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching registration data:', fetchError);
    }

    // If we have registration data, process the registration
    if (registrationData && registrationData.length > 0) {
      const userData = registrationData[0].registration_data;
      
      console.log('Found registration data:', {
        email: userData.email,
        planId
      });

      // Extract user information
      const { email, userData: { firstName, lastName, phone }, contractDetails } = userData;
      
      try {
        // Create the user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: userData.password || Math.random().toString(36).slice(-8), // Generate random password if none provided
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            phone,
            is_new_user: true
          }
        });

        if (authError) {
          throw authError;
        }

        // If user created successfully, update the registration data as used
        if (authUser.user) {
          // Mark the registration data as used
          await supabase
            .from('temp_registration_data')
            .update({ used: true })
            .eq('id', registrationData[0].id);
          
          // Create subscription record
          const now = new Date();
          let periodEndsAt = null;
          let trialEndsAt = null;
          
          if (planId === 'monthly') {
            trialEndsAt = new Date(now);
            trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
          } else if (planId === 'annual') {
            periodEndsAt = new Date(now);
            periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
          }
          
          // Create subscription record
          await supabase
            .from('subscriptions')
            .insert({
              user_id: authUser.user.id,
              plan_type: planId,
              status: planId === 'monthly' ? 'trial' : 'active',
              trial_ends_at: trialEndsAt?.toISOString() || null,
              current_period_ends_at: periodEndsAt?.toISOString() || null,
              payment_method: {
                type: 'card', 
                provider: 'cardcom',
                last_transaction_id: webhookData.TranzactionInfo?.TranzactionId
              },
              contract_signed: Boolean(contractDetails),
              contract_signed_at: contractDetails ? now.toISOString() : null
            });

          // Create user profile if needed
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.user.id)
            .single();

          if (profileError || !profile) {
            // Create profile
            await supabase
              .from('profiles')
              .insert({
                id: authUser.user.id,
                first_name: firstName,
                last_name: lastName,
                phone,
                email
              });
          }
          
          console.log('Successfully created user and subscription for registration');
        }
      } catch (error) {
        console.error('Error processing registration:', error);
      }
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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
