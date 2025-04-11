
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
    const { lowProfileId } = await req.json();

    if (!lowProfileId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: lowProfileId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Checking transaction status for lowProfileId:', lowProfileId);

    // Get the Cardcom API credentials from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL") || "";
    const apiName = Deno.env.get("CARDCOM_USERNAME") || "";

    // Create request for Cardcom API to check low profile transaction status
    const getLowProfileRequest = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      LowProfileId: lowProfileId
    };

    // Call Cardcom API to get transaction status
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getLowProfileRequest),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cardcom API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
    }
    
    const transactionResult = await response.json();
    console.log('Transaction result:', JSON.stringify(transactionResult));

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Process transaction based on the status
    if (transactionResult.ResponseCode === 0 && 
        transactionResult.Operation === "ChargeOnly" &&
        transactionResult.TranzactionInfo?.ResponseCode === 0) {
      
      // Extract transaction details
      const {
        TranzactionInfo,
        LowProfileId,
        ReturnValue: planId,
        UIValues
      } = transactionResult;
      
      console.log('Successfully processed transaction:', {
        LowProfileId,
        planId,
        transactionId: TranzactionInfo.TranzactionId
      });

      // Try to find a user either from temp registration data or directly by email
      let userId = null;
      const userEmail = UIValues?.CardOwnerEmail || null;
      
      if (userEmail) {
        // Check if this is a new registration
        const { data: tempRegistrationData } = await supabaseClient
          .from('temp_registration_data')
          .select('*')
          .eq('used', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (tempRegistrationData) {
          // This is a new registration - create the user first
          const registrationData = tempRegistrationData.registration_data;
          
          if (registrationData.email && registrationData.password) {
            console.log('Creating new user from registration data');
            
            // Create the user
            const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
              email: registrationData.email,
              password: registrationData.password,
              email_confirm: true,
              user_metadata: {
                full_name: registrationData.userData?.firstName + ' ' + registrationData.userData?.lastName
              }
            });
            
            if (authError) {
              console.error('Error creating user:', authError);
            } else if (authData.user) {
              userId = authData.user.id;
              
              // Update profile with registration data
              if (userId && registrationData.userData) {
                await supabaseClient.from('profiles').update({
                  first_name: registrationData.userData.firstName,
                  last_name: registrationData.userData.lastName,
                  phone: registrationData.userData.phone,
                }).eq('id', userId);
              }
              
              // Mark registration data as used
              await supabaseClient.from('temp_registration_data')
                .update({ used: true })
                .eq('id', tempRegistrationData.id);
            }
          }
        } else {
          // This is an existing user - find them by email
          const { data: userData } = await supabaseClient.auth.admin
            .listUsers();
          
          const user = userData.users.find(
            (u) => u.email?.toLowerCase() === userEmail.toLowerCase()
          );
          
          if (user) {
            userId = user.id;
          }
        }
      }
      
      // If we have a user ID, create or update subscription
      if (userId) {
        console.log('Processing subscription for user:', userId);
        
        const now = new Date();
        let trialEndsAt = null;
        let currentPeriodEndsAt = null;
        let status = 'active';
        
        // Set subscription parameters based on plan
        if (planId === 'monthly') {
          // For monthly plans, start with a trial period
          status = 'trial';
          trialEndsAt = new Date(now);
          trialEndsAt.setMonth(now.getMonth() + 1);
        } else if (planId === 'annual') {
          // For annual plans, set the period end to one year from now
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setFullYear(now.getFullYear() + 1);
        }
        // For VIP plans, no need for trial or period end dates
        
        // Payment method details
        const paymentMethod = {
          lastFourDigits: TranzactionInfo.Last4CardDigitsString || "",
          expiryMonth: TranzactionInfo.CardMonth?.toString() || "",
          expiryYear: TranzactionInfo.CardYear?.toString() || "",
          cardholderName: UIValues.CardOwnerName || "",
        };
        
        // Create or update subscription
        const { error: subscriptionError } = await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_type: planId,
            status: status,
            trial_ends_at: trialEndsAt?.toISOString() || null,
            current_period_ends_at: currentPeriodEndsAt?.toISOString() || null,
            payment_method: paymentMethod,
            contract_signed: true,
            contract_signed_at: now.toISOString()
          });
        
        if (subscriptionError) {
          console.error('Error creating subscription:', subscriptionError);
        }
        
        // Log the payment
        const { error: paymentError } = await supabaseClient
          .from('payment_history')
          .insert({
            user_id: userId,
            subscription_id: userId, // Using user ID as subscription ID for simplicity
            amount: TranzactionInfo.Amount,
            currency: 'ILS',
            status: 'completed',
            payment_method: paymentMethod,
            payment_date: now.toISOString()
          });
        
        if (paymentError) {
          console.error('Error logging payment:', paymentError);
        }
      } else {
        console.log('Could not find or create user for transaction');
      }
    } else if (transactionResult.ResponseCode !== 0) {
      console.error('Transaction failed with response code:', transactionResult.ResponseCode);
      console.error('Transaction error description:', transactionResult.Description);
    }
    
    // Return the transaction result to the client
    return new Response(
      JSON.stringify(transactionResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
