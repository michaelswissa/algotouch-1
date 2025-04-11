
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
    console.log('Received request to cardcom-check-status');
    
    const { lowProfileId } = await req.json();
    
    if (!lowProfileId) {
      throw new Error('Missing lowProfileId parameter');
    }
    
    console.log('Checking status for lowProfileId:', lowProfileId);
    
    // Get the Cardcom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_USERNAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    
    if (!terminalNumber || !apiName || !apiPassword) {
      throw new Error('Missing Cardcom API credentials');
    }

    // Call Cardcom API to check the status of the transaction
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        TerminalNumber: Number(terminalNumber),
        ApiName: apiName,
        ApiPassword: apiPassword,
        LowProfileId: lowProfileId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const lpResult = await response.json();
    console.log('LowProfile result:', lpResult);
    
    if (lpResult.ResponseCode !== 0) {
      throw new Error(`Cardcom error: ${lpResult.Description}`);
    }
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process the payment response
    if (lpResult.OperationResponse === 0 && lpResult.TranzactionInfo?.TranzactionId) {
      const transactionId = lpResult.TranzactionInfo.TranzactionId;
      const planId = lpResult.ReturnValue;
      const userId = lpResult.UIValues?.CustomFields?.find((field: any) => field.Id === 1)?.Value;
      const userEmail = lpResult.UIValues?.CardOwnerEmail;
      const userName = lpResult.UIValues?.CardOwnerName;

      console.log('Processing successful transaction:', { 
        transactionId, 
        planId, 
        userId, 
        userEmail,
        userName
      });

      if (userId) {
        // Get current date
        const now = new Date();
        
        // Calculate period end date based on plan
        let trialEndsAt = null;
        let currentPeriodEndsAt = null;
        let status = 'active';
        let nextChargeDate = null;
        
        if (planId === 'monthly') {
          // Monthly plan = 1 month free trial, then 371 ILS monthly recurring
          status = 'trial';
          trialEndsAt = new Date(now);
          trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
          nextChargeDate = new Date(trialEndsAt);
        } else if (planId === 'annual') {
          // Annual plan = immediate 3,371 ILS charge, then yearly recurring
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
          nextChargeDate = new Date(currentPeriodEndsAt);
        }
        // VIP plan is one-time charge of 13,121 ILS, no recurring

        // Store payment method info from transaction
        const paymentMethod = {
          lastFourDigits: lpResult.TranzactionInfo.Last4CardDigits?.toString() || "",
          expiryMonth: lpResult.TranzactionInfo.CardMonth?.toString().padStart(2, '0') || "",
          expiryYear: lpResult.TranzactionInfo.CardYear?.toString().padStart(2, '0') || "",
          cardholderName: lpResult.UIValues?.CardOwnerName || "",
          tokenCreated: lpResult.Operation === "ChargeAndCreateToken" || lpResult.Operation === "CreateTokenOnly",
          token: lpResult.TokenInfo?.Token || null,
          tokenExpiryDate: lpResult.TokenInfo?.TokenExDate || null
        };
        
        // Store token if it was created
        let paymentTokenId = null;
        
        if (paymentMethod.token) {
          const { data: tokenData, error: tokenError } = await supabaseClient
            .from('payment_tokens')
            .insert({
              user_id: userId,
              token: paymentMethod.token,
              card_last_four: paymentMethod.lastFourDigits,
              card_brand: lpResult.TranzactionInfo.Brand || null,
              token_expiry: paymentMethod.tokenExpiryDate,
              is_active: true
            })
            .select('id')
            .single();
            
          if (tokenError) {
            console.error('Error storing token:', tokenError);
          } else if (tokenData) {
            paymentTokenId = tokenData.id;
            console.log('Payment token stored with ID:', paymentTokenId);
          }
        }

        // Update or create subscription
        const { data: subscriptionData, error: subscriptionError } = await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_type: planId,
            status: status,
            trial_ends_at: trialEndsAt?.toISOString() || null,
            current_period_ends_at: currentPeriodEndsAt?.toISOString() || null,
            next_charge_date: nextChargeDate?.toISOString() || null,
            payment_method: paymentMethod,
            payment_token_id: paymentTokenId,
            contract_signed: true,
            contract_signed_at: now.toISOString()
          })
          .select('id')
          .single();
          
        if (subscriptionError) {
          console.error('Error updating subscription:', subscriptionError);
          throw new Error(`Error updating subscription: ${subscriptionError.message}`);
        }
        
        // Record the payment
        const subscriptionId = subscriptionData?.id;
        let amount = 0;
        
        if (planId === 'monthly') {
          // Free trial, no charge yet
          amount = 0;
        } else if (planId === 'annual') {
          amount = 3371; // 3,371 ILS
        } else if (planId === 'vip') {
          amount = 13121; // 13,121 ILS
        }
        
        if (amount > 0) {
          const { error: paymentError } = await supabaseClient
            .from('payment_history')
            .insert({
              user_id: userId,
              subscription_id: subscriptionId,
              amount: amount,
              currency: 'ILS',
              status: 'completed',
              payment_method: paymentMethod,
              payment_date: now.toISOString()
            });
            
          if (paymentError) {
            console.error('Error recording payment history:', paymentError);
          }
        }
      }
    }

    return new Response(JSON.stringify(lpResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
