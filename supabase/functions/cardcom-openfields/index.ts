
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
    const requestData = await req.json();
    
    // Destructure the request data
    const { 
      planId, 
      planName, 
      amount, 
      userEmail, 
      userName, 
      userId, 
      isRegistration,
      registrationData,
      isRecurring = false,
      freeTrialDays = 0
    } = requestData;
    
    console.log('Creating payment session for:', { 
      planId, 
      planName, 
      amount, 
      userEmail, 
      userId,
      isRecurring,
      freeTrialDays
    });

    // Get the Cardcom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Determine the operation type based on the plan and recurring flag
    // 1 = Charge only (For VIP plan)
    // 2 = Charge and create token (For annual plan)
    // 3 = Create token only (For monthly trial plan)
    const operationType = planId === 'vip' ? 1 : (planId === 'annual' ? 2 : 3);
    
    // Define the success and error redirect URLs
    const origin = new URL(req.url).origin;
    const successUrl = `${origin}/subscription?success=true&planId=${planId}`;
    const errorUrl = `${origin}/subscription?error=true&planId=${planId}`;
    
    // Prepare the Cardcom request data
    const cardcomData = {
      TerminalNumber: parseInt(terminalNumber),
      ApiName: apiName,
      ReturnValue: userId || "guest",
      // For monthly plans with trial, we set Amount to 0 for token creation
      Amount: operationType === 3 ? 0 : amount,
      SuccessRedirectUrl: successUrl,
      FailedRedirectUrl: errorUrl,
      WebHookUrl: `${origin}/api/cardcom-webhook`, // This should be a valid endpoint that can receive Cardcom webhooks
      ProductName: planName || "Subscription",
      Language: "he",
      Operation: operationType.toString(),
      UIDefinition: {
        CardOwnerNameValue: userName || "",
        CardOwnerEmailValue: userEmail || "",
      }
    };
    
    // For recurring plans, add the advanced definition
    if (isRecurring) {
      cardcomData.AdvancedDefinition = {
        // If the plan is monthly with a trial, set J2 for validation only
        // If it's annual, set J5 for authorization
        JValidateType: planId === 'monthly' ? 2 : 5,
        IsAutoRecurringPayment: true
      };
    }
    
    console.log('Sending request to Cardcom with data:', {
      terminalNumber: cardcomData.TerminalNumber,
      operation: cardcomData.Operation,
      amount: cardcomData.Amount,
      isRecurring
    });
    
    // Make request to Cardcom API
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardcomData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cardcom API error:', response.status, errorText);
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
    }
    
    const cardcomResponse = await response.json();
    
    if (cardcomResponse.ResponseCode !== 0) {
      console.error('Cardcom response error:', cardcomResponse);
      throw new Error(`Cardcom error: ${cardcomResponse.Description}`);
    }
    
    console.log('Cardcom response:', cardcomResponse);
    
    // Store the pending subscription information in the database
    if (userId) {
      try {
        const { data: existingSubscription, error: getError } = await supabaseClient
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (getError) {
          console.error('Error checking existing subscription:', getError);
        }
        
        // Only create a new subscription if one doesn't exist or if it's cancelled
        if (!existingSubscription || existingSubscription.status === 'cancelled') {
          // For monthly plans with trial, set up a trial subscription
          const now = new Date();
          const subscriptionData = {
            user_id: userId,
            plan_type: planId,
            status: planId === 'monthly' ? 'trial' : 'pending',
            current_period_starts_at: now.toISOString(),
            // If it's a trial, set the end date accordingly
            trial_ends_at: freeTrialDays > 0 ? 
              new Date(now.setDate(now.getDate() + freeTrialDays)).toISOString() : 
              null,
            // Set the next charge date to after the trial ends
            next_charge_date: freeTrialDays > 0 ? 
              new Date(now.setDate(now.getDate() + freeTrialDays)).toISOString() : 
              null,
            cardcom_profile_id: cardcomResponse.LowProfileId,
          };
          
          const { error: insertError } = await supabaseClient
            .from('subscriptions')
            .upsert(subscriptionData);
            
          if (insertError) {
            console.error('Error creating subscription:', insertError);
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue anyway, as we don't want to block the payment process
      }
    }
    
    // Return the success response
    return new Response(
      JSON.stringify({
        success: true,
        lowProfileId: cardcomResponse.LowProfileId,
        url: cardcomResponse.Url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing payment creation:', error);
    
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
