
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
        JSON.stringify({ 
          error: "Missing lowProfileId parameter", 
          success: false 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get the Cardcom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    console.log('Checking transaction status for lowProfileId:', lowProfileId);
    
    // Make request to Cardcom API to get the transaction status
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        TerminalNumber: parseInt(terminalNumber),
        ApiName: apiName,
        LowProfileId: lowProfileId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cardcom API error:', response.status, errorText);
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
    }
    
    const cardcomResponse = await response.json();
    console.log('Cardcom response:', cardcomResponse);
    
    if (cardcomResponse.ResponseCode !== 0) {
      console.error('Cardcom response error:', cardcomResponse);
      throw new Error(`Cardcom error: ${cardcomResponse.Description}`);
    }
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // If the transaction was successful, update the subscription in the database
    if (cardcomResponse.OperationResponse === 0) {
      try {
        // Get the user ID from the ReturnValue field
        const userId = cardcomResponse.ReturnValue;
        
        if (userId && userId !== 'guest') {
          // Check if the user has a pending subscription
          const { data: subscriptionData, error: subscriptionError } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('cardcom_profile_id', lowProfileId)
            .maybeSingle();
            
          if (subscriptionError) {
            console.error('Error fetching subscription:', subscriptionError);
          } else if (subscriptionData) {
            // Get operation details
            const operation = cardcomResponse.Operation;
            const planType = subscriptionData.plan_type;
            
            // Payment method details
            const paymentMethod = {
              lastFourDigits: cardcomResponse.TranzactionInfo?.Last4CardDigitsString || 
                               cardcomResponse.TranzactionInfo?.Last4CardDigits?.toString() || 
                               '0000',
              expiryMonth: cardcomResponse.CardValidityMonth || 
                           cardcomResponse.TranzactionInfo?.CardMonth?.toString().padStart(2, '0') || 
                           '12',
              expiryYear: cardcomResponse.CardValidityYear || 
                          cardcomResponse.TranzactionInfo?.CardYear?.toString() || 
                          '25',
              cardBrand: cardcomResponse.TranzactionInfo?.Brand || 'Unknown',
              cardholderName: cardcomResponse.UIValues?.CardOwnerName || 
                              cardcomResponse.TranzactionInfo?.CardOwnerName || 
                              'Card Holder'
            };
            
            // Token details if created (for recurring payments)
            let token = null;
            if (operation === "CreateTokenOnly" || operation === "ChargeAndCreateToken") {
              token = cardcomResponse.Token || null;
            }
            
            // Update the subscription status and payment details
            const now = new Date();
            const updateData: Record<string, any> = {
              status: planType === 'monthly' ? 'trial' : 'active',
              payment_method: paymentMethod,
              updated_at: now.toISOString(),
            };
            
            // For monthly plans with trial
            if (planType === 'monthly') {
              const trialEnds = new Date();
              trialEnds.setDate(trialEnds.getDate() + 30); // 30-day trial
              updateData.trial_ends_at = trialEnds.toISOString();
              updateData.next_charge_date = trialEnds.toISOString();
            } 
            // For annual plans
            else if (planType === 'annual') {
              const periodEnds = new Date();
              periodEnds.setFullYear(periodEnds.getFullYear() + 1); // 1-year subscription
              updateData.current_period_ends_at = periodEnds.toISOString();
              updateData.next_charge_date = periodEnds.toISOString();
            }
            // For VIP plans (one-time payment)
            else if (planType === 'vip') {
              updateData.trial_ends_at = null;
              updateData.current_period_ends_at = null;
              updateData.next_charge_date = null;
            }
            
            if (token) {
              // Create or update payment token
              const { error: tokenError } = await supabaseClient
                .from('payment_tokens')
                .upsert({
                  user_id: userId,
                  token: token,
                  is_default: true,
                  token_details: {
                    ...paymentMethod,
                    created_at: now.toISOString()
                  }
                });

              if (tokenError) {
                console.error('Error saving payment token:', tokenError);
              }
            }
            
            // Update subscription record
            const { error: updateError } = await supabaseClient
              .from('subscriptions')
              .update(updateData)
              .eq('id', subscriptionData.id);
              
            if (updateError) {
              console.error('Error updating subscription:', updateError);
            }
            
            // Record payment history
            if (operation === "ChargeOnly" || operation === "ChargeAndCreateToken") {
              // Calculate amount based on plan type
              let paymentAmount = 0;
              if (planType === 'monthly') {
                paymentAmount = 0; // Free trial
              } else if (planType === 'annual') {
                paymentAmount = 3371; // Annual price in ILS
              } else if (planType === 'vip') {
                paymentAmount = 13121; // VIP price in ILS
              }
              
              // Skip payment recording for free trials
              if (paymentAmount > 0) {
                const { error: paymentError } = await supabaseClient
                  .from('payment_history')
                  .insert({
                    user_id: userId,
                    subscription_id: subscriptionData.id,
                    amount: paymentAmount,
                    currency: 'ILS',
                    status: 'completed',
                    payment_method: {
                      ...paymentMethod,
                      transactionId: cardcomResponse.TranzactionInfo?.TranzactionId || null,
                      approvalNumber: cardcomResponse.TranzactionInfo?.ApprovalNumber || null
                    },
                    payment_date: now.toISOString()
                  });
                
                if (paymentError) {
                  console.error('Error recording payment history:', paymentError);
                }
              }
            }
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Don't throw, as we still want to return the Cardcom response
      }
    }
    
    // Return the success response
    return new Response(
      JSON.stringify(cardcomResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking transaction status:', error);
    
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
