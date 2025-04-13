
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
    
    // Check if we have a payment session for this lowProfileId
    const { data: paymentSession } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('payment_details->lowProfileId', lowProfileId)
      .maybeSingle();
      
    // If no session found, we need to be careful about proceeding
    if (!paymentSession) {
      console.warn('No payment session found for this lowProfileId:', lowProfileId);
      // We'll continue anyway to check with Cardcom directly
    } else {
      console.log('Found payment session:', paymentSession);
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
      
      // Handle user ID from payment session or ReturnValue
      const userId = paymentSession?.user_id || responseData.ReturnValue;
      const planType = paymentSession?.plan_id || responseData.planType || 'monthly';
      
      // Get transaction details
      const transactionId = responseData.InternalDealNumber;
      const amount = responseData.SumToBill || paymentSession?.payment_details?.amount || 0;
      
      if (userId) {
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
        
        // See if there's an existing subscription
        const { data: existingSubscription } = await supabaseClient
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
          
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
        
        // Update payment session status
        if (paymentSession) {
          await supabaseClient
            .from('payment_sessions')
            .update({
              payment_details: { 
                ...paymentSession.payment_details,
                status: 'completed',
                completed_at: new Date().toISOString(),
                transaction_id: transactionId
              }
            })
            .eq('id', paymentSession.id);
        }
      }
    } else {
      console.log('Transaction failed or pending:', responseData.OperationResponse);
      
      // Log the failure
      if (paymentSession?.user_id) {
        await supabaseClient
          .from('payment_errors')
          .insert({
            user_id: paymentSession.user_id,
            error_code: responseData.OperationResponse || 'unknown',
            error_message: responseData.Description || "Unknown error",
            context: "cardcom-check-status",
            payment_details: {
              lowProfileId,
              plan_id: paymentSession.plan_id
            }
          });
      }
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
