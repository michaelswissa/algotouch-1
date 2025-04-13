
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
      throw new Error('Missing lowProfileId parameter');
    }
    
    console.log('Checking status for lowProfileId:', lowProfileId);

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
    
    // First, check if we've already processed this payment
    const { data: existingPayment } = await supabaseClient
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .eq('status', 'completed')
      .maybeSingle();
    
    if (existingPayment) {
      console.log('Payment already processed for this lowProfileId:', existingPayment);
      return new Response(
        JSON.stringify({
          ResponseCode: 0,
          Description: 'Payment already processed',
          TranzactionInfo: {
            TranzactionId: existingPayment.transaction_details?.transaction_id || 0
          },
          Operation: existingPayment.transaction_details?.operation || 1
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Construct the URL for making the request to Cardcom's API
    const cardcomUrl = `https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx?terminalnumber=${terminalNumber}&username=${apiName}&lowprofilecode=${lowProfileId}&codepage=65001`;
    
    // Make the request to Cardcom's API
    const response = await fetch(cardcomUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cardcom API error:', response.status, errorText);
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response data
    const responseText = await response.text();
    
    // Parse the response data
    let responseData: Record<string, any> = {};
    const responseParams = new URLSearchParams(responseText);
    
    // Convert the URLSearchParams to a plain object
    for (const [key, value] of responseParams.entries()) {
      responseData[key] = value;
    }
    
    console.log('Cardcom response data:', responseData);
    
    // Check if the transaction was successful
    if (responseData.OperationResponse === '0') {
      console.log('Transaction successful');
      
      // If we have a user ID in the ReturnValue, update their subscription
      if (responseData.ReturnValue) {
        try {
          const userId = responseData.ReturnValue;
          const planType = responseData.planType || 'monthly'; // Default to monthly if not specified
          
          // Get transaction details
          const transactionId = responseData.InternalDealNumber;
          const amount = responseData.Amount || 0;
          
          // Record the payment in user_payment_logs
          if (transactionId) {
            const { error: logError } = await supabaseClient
              .from('user_payment_logs')
              .insert([{
                user_id: userId,
                token: lowProfileId,
                amount: amount,
                status: 'completed',
                approval_code: responseData.ApprovalNumber71 || '',
                transaction_details: {
                  transaction_id: transactionId,
                  plan_type: planType,
                  operation: responseData.Operation || 1,
                  card_last_four: responseData.CardNumber5 || '',
                  timestamp: new Date().toISOString()
                }
              }]);
              
            if (logError) {
              console.error('Error recording payment log:', logError);
            }
          }
          
          // Update the user's subscription in the database
          if (userId) {
            // See if there's an existing subscription
            const { data: existingSubscription, error: subscriptionError } = await supabaseClient
              .from('subscriptions')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
              
            if (subscriptionError) {
              console.error('Error fetching subscription:', subscriptionError);
            }
            
            // Determine subscription details based on plan type
            const now = new Date();
            let subscriptionData: Record<string, any> = {
              user_id: userId,
              plan_type: planType,
              status: planType === 'monthly' ? 'trial' : 'active',
              updated_at: now.toISOString(),
              payment_method: {
                lastFourDigits: responseData.CardNumber5 || '',
                expiryMonth: responseData.Tokef30 ? responseData.Tokef30.substring(0, 2) : '',
                expiryYear: responseData.Tokef30 ? responseData.Tokef30.substring(2) : ''
              }
            };
            
            // Set trial_ends_at for monthly plans
            if (planType === 'monthly') {
              const trialEndDate = new Date(now);
              trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days trial
              subscriptionData.trial_ends_at = trialEndDate.toISOString();
              subscriptionData.next_charge_date = trialEndDate.toISOString();
            } else if (planType === 'annual') {
              // For annual plans, set the period end date to 1 year from now
              const periodEndDate = new Date(now);
              periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
              subscriptionData.current_period_ends_at = periodEndDate.toISOString();
              subscriptionData.next_charge_date = periodEndDate.toISOString();
            }
            
            if (existingSubscription) {
              // Update existing subscription
              const { error: updateError } = await supabaseClient
                .from('subscriptions')
                .update(subscriptionData)
                .eq('id', existingSubscription.id);
                
              if (updateError) {
                console.error('Error updating subscription:', updateError);
              }
            } else {
              // Create new subscription
              const { error: insertError } = await supabaseClient
                .from('subscriptions')
                .insert([subscriptionData]);
                
              if (insertError) {
                console.error('Error creating subscription:', insertError);
              }
            }
            
            // Record the payment in payment_history
            if (transactionId) {
              const { error: paymentError } = await supabaseClient
                .from('payment_history')
                .insert([{
                  user_id: userId,
                  subscription_id: existingSubscription?.id || null,
                  amount: amount,
                  currency: 'ILS',
                  status: 'completed',
                  payment_method: {
                    type: 'cardcom',
                    lastFourDigits: responseData.CardNumber5 || '',
                    brand: responseData.Mutag_24 || '',
                    transactionId: transactionId
                  },
                  payment_date: now.toISOString()
                }]);
                
              if (paymentError) {
                console.error('Error recording payment history:', paymentError);
              }
            }
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Continue processing even if DB operations fail
        }
      }
    } else {
      console.log('Transaction failed or pending:', responseData.OperationResponse);
    }
    
    // Return the response data
    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        ResponseCode: 999,
        Description: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
