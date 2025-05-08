
// Debug edge function to help test and fix subscriptions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// No auth verification needed for webhooks
serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log('Cardcom webhook started');
    
    // Create a Supabase client with service role (since this is a webhook)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Parse request body
    const payload = await req.json();
    
    console.log('Received webhook notification:', JSON.stringify(payload));

    // Log the webhook data in payment_webhooks table
    const { data: logData, error: logError } = await supabaseClient
      .from('payment_webhooks')
      .insert({
        webhook_type: 'cardcom',
        payload: payload,
        processed: false,
        processing_attempts: 0
      })
      .select();
    
    if (logError) {
      console.error('Error logging webhook to payment_webhooks:', logError);
      throw new Error(`Failed to log webhook: ${logError.message}`);
    }

    console.log('Webhook logged successfully with ID:', logData?.[0]?.id);
    
    // Enhanced error handling for webhook processing
    try {
      // Process the webhook based on the payload data
      const { ResponseCode, LowProfileId, TranzactionId, ReturnValue } = payload;
      
      console.log(`Processing payment with ResponseCode: ${ResponseCode}, LowProfileId: ${LowProfileId}, ReturnValue: ${ReturnValue}`);
      
      // Improved duplicate payment checking
      const { data: existingPayment, error: checkError } = await supabaseClient
        .rpc('check_duplicate_payment_extended', { low_profile_id: LowProfileId });
        
      if (checkError) {
        console.error('Error checking for duplicate payment:', checkError);
        throw new Error(`Duplicate check failed: ${checkError.message}`);
      } 
      
      if (existingPayment && existingPayment.exists) {
        console.log('Payment already processed:', existingPayment);
        
        // Mark the webhook as processed since we already handled this payment
        if (logData && logData.length > 0) {
          await supabaseClient
            .from('payment_webhooks')
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              processing_result: { 
                success: true, 
                message: 'Webhook already processed',
                payment_id: existingPayment.transaction_id
              }
            })
            .eq('id', logData[0].id);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Webhook already processed', 
            paymentId: existingPayment.transaction_id
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Only proceed with successful payments (ResponseCode === 0)
      if (ReturnValue && ResponseCode === 0) {
        console.log(`Processing successful payment for ReturnValue: ${ReturnValue}`);
        
        // Check if this is a temporary registration ID or user ID
        if (ReturnValue.startsWith('temp_reg_')) {
          // This is a temporary registration ID
          await processRegistrationPayment(supabaseClient, ReturnValue, payload);
        } else {
          // This is a user ID
          await processUserPayment(supabaseClient, ReturnValue, payload);
        }

        // Mark the webhook as processed
        if (logData && logData.length > 0) {
          const { error: updateError } = await supabaseClient
            .from('payment_webhooks')
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              processing_result: { success: true }
            })
            .eq('id', logData[0].id);

          if (updateError) {
            console.error('Error updating webhook status:', updateError);
          }
        }
      } else {
        console.error(`Invalid or failed payment: ResponseCode=${ResponseCode}, ReturnValue=${ReturnValue}`);
        
        // Log the failed payment
        if (logData && logData.length > 0) {
          const { error: updateError } = await supabaseClient
            .from('payment_webhooks')
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              processing_result: { 
                success: false,
                error: `Invalid payment: ResponseCode=${ResponseCode}` 
              }
            })
            .eq('id', logData[0].id);

          if (updateError) {
            console.error('Error updating webhook status for failed payment:', updateError);
          }
        }
      }

      // Acknowledge receipt of webhook
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook received and processed' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (processingError) {
      console.error('Error processing webhook:', processingError);
      
      // Record the processing error but don't throw it
      if (logData && logData.length > 0) {
        await supabaseClient
          .from('payment_webhooks')
          .update({
            processing_attempts: 1,
            processing_result: { 
              success: false, 
              error: processingError.message || 'Unknown error'
            }
          })
          .eq('id', logData[0].id);
      }
      
      // Log the error to system_logs for monitoring
      await supabaseClient
        .from('system_logs')
        .insert({
          level: 'ERROR',
          function_name: 'cardcom-webhook',
          message: 'Error processing payment webhook',
          details: {
            error: processingError.message,
            payload: payload
          }
        });
      
      // Still return 200 to acknowledge receipt (webhook best practice)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error processing webhook',
          error: processingError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Always return 200 for webhooks
        }
      );
    }
  } catch (error) {
    console.error('Error in webhook handler (outer try/catch):', error);
    
    // Still return 200 to acknowledge receipt (webhook best practice)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Critical error processing webhook',
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Always return 200 for webhooks
      }
    );
  }
});

// Process payment for registered user - enhanced with better subscription handling
async function processUserPayment(supabase, userId, payload) {
  console.log(`Processing payment for user: ${userId}`);
  
  try {
    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error getting user data:', userError);
      throw new Error(`User not found: ${userError.message}`);
    }
    
    // Log payment in payment_logs with enhanced error handling
    const { data: paymentData, error: paymentLogError } = await supabase
      .from('payment_logs')
      .insert({
        user_id: userId,
        plan_id: getPlanFromAmount(payload.Amount),
        transaction_id: String(payload.TranzactionId),
        amount: payload.Amount,
        currency: 'ILS',
        payment_status: payload.ResponseCode === 0 ? 'completed' : 'failed',
        payment_data: {
          response_code: payload.ResponseCode,
          low_profile_id: payload.LowProfileId,
          card_info: {
            last4: payload.Last4CardDigits,
            expiry: `${payload.CardMonth}/${payload.CardYear}`
          },
          transaction_time: new Date().toISOString()
        }
      })
      .select();
      
    if (paymentLogError) {
      console.error('Error creating payment log:', paymentLogError);
      throw new Error(`Failed to log payment: ${paymentLogError.message}`);
    }

    console.log('Payment log created:', paymentData);
    
    // Create/update user's subscription status with enhanced error handling
    try {
      await createOrUpdateSubscription(supabase, userId, payload);
      console.log('Subscription created or updated successfully for user:', userId);
    } catch (subError) {
      console.error('Failed to create/update subscription:', subError);
      
      // Log the subscription error but don't fail the entire payment process
      await supabase
        .from('payment_errors')
        .insert({
          user_id: userId,
          error_message: `Subscription creation failed: ${subError.message}`,
          error_code: 'subscription_creation_error',
          request_data: { payload },
        });
        
      // Attempt recovery - make sure payment is still recorded
      console.log('Attempting subscription recovery...');
      await forceCreateSubscription(supabase, userId, payload);
    }
    
    // Update payment session if it exists
    await updatePaymentSession(supabase, payload.LowProfileId, userId, 'completed', payload.TranzactionId);
    
    return { success: true, paymentId: paymentData[0].id };
  } catch (error) {
    console.error('Error in processUserPayment:', error);
    
    // Record the error but don't throw to prevent webhook failure
    await supabase
      .from('payment_errors')
      .insert({
        user_id: userId,
        error_message: error.message,
        request_data: { payload },
        error_code: 'webhook_processing_error'
      });
      
    return { success: false, error: error.message };
  }
}

// Process payment for temporary registration
async function processRegistrationPayment(supabase, regId, payload) {
  console.log(`Processing payment for registration: ${regId}`);
  
  try {
    // Mark the payment as verified in the registration data
    const { data: regData, error } = await supabase
      .from('temp_registration_data')
      .update({ 
        payment_verified: true,
        payment_details: {
          transaction_id: payload.TranzactionId,
          low_profile_id: payload.LowProfileId,
          amount: payload.Amount,
          response_code: payload.ResponseCode,
          card_info: {
            last4: payload.Last4CardDigits,
            expiry: `${payload.CardMonth}/${payload.CardYear}`
          },
          transaction_time: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', regId)
      .select('registration_data');
    
    if (error) {
      console.error('Error updating registration payment status:', error);
      throw error;
    }

    console.log('Registration data updated:', regData);
    
    // If registration data contains user_id, also update subscription
    if (regData && regData.length > 0 && regData[0].registration_data.userId) {
      const userId = regData[0].registration_data.userId;
      
      try {
        await createOrUpdateSubscription(supabase, userId, payload);
      } catch (subError) {
        console.error('Failed to create/update subscription for registration:', subError);
        // Attempt recovery
        await forceCreateSubscription(supabase, userId, payload);
      }
      
      // Log the payment in payment_logs
      await supabase
        .from('payment_logs')
        .insert({
          user_id: userId,
          plan_id: getPlanFromAmount(payload.Amount),
          transaction_id: String(payload.TranzactionId),
          amount: payload.Amount,
          currency: 'ILS',
          payment_status: 'completed',
          payment_data: {
            response_code: payload.ResponseCode,
            low_profile_id: payload.LowProfileId,
            registration_id: regId,
            card_info: {
              last4: payload.Last4CardDigits,
              expiry: `${payload.CardMonth}/${payload.CardYear}`
            }
          }
        });
    }
    
    // Update payment session if it exists
    await updatePaymentSession(supabase, payload.LowProfileId, null, 'completed', payload.TranzactionId);
  } catch (error) {
    console.error('Error in processRegistrationPayment:', error);
    // Record the error but don't throw to prevent webhook failure
    await supabase
      .from('payment_errors')
      .insert({
        user_id: null, // No user ID available
        error_message: error.message,
        request_data: { regId, payload },
        error_code: 'registration_payment_error'
      });
  }
}

// Last resort function to force create a subscription when normal flow fails
async function forceCreateSubscription(supabase, userId, payload) {
  console.log(`Force creating subscription for user ${userId}`);
  
  try {
    const planId = getPlanFromAmount(payload.Amount);
    const now = new Date();
    let periodEndsAt = null;
    
    // Set appropriate subscription period based on plan type
    if (planId === 'monthly') {
      periodEndsAt = new Date(now);
      periodEndsAt.setMonth(periodEndsAt.getMonth() + 1);
    } else if (planId === 'annual') {
      periodEndsAt = new Date(now);
      periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
    } // VIP plans have no end date
    
    const cardInfo = {
      lastFourDigits: payload.Last4CardDigits || '0000',
      expiryMonth: payload.CardMonth || '12',
      expiryYear: payload.CardYear || '25'
    };
    
    // Create new subscription (overriding any existing ones)
    const { data: newSub, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: planId,
        status: 'active',
        current_period_ends_at: periodEndsAt?.toISOString(),
        payment_method: cardInfo,
        contract_signed: true,
        contract_signed_at: now.toISOString()
      })
      .select();
      
    if (insertError) {
      console.error('Error force creating subscription:', insertError);
      throw insertError;
    }
    
    // Log the recovery action
    await supabase
      .from('system_logs')
      .insert({
        level: 'INFO',
        function_name: 'forceCreateSubscription',
        message: `Force created subscription for user ${userId}`,
        details: {
          user_id: userId,
          subscription_id: newSub[0].id,
          plan_id: planId,
          transaction_id: payload.TranzactionId
        }
      });
      
    console.log('Subscription force created successfully:', newSub);
    return newSub[0];
  } catch (error) {
    console.error('Error in forceCreateSubscription:', error);
    throw error;
  }
}

// Helper function to create or update a subscription
async function createOrUpdateSubscription(supabase, userId, payload) {
  const planId = getPlanFromAmount(payload.Amount);
  console.log(`Creating/updating subscription for user ${userId} with plan ${planId}`);
  
  try {
    const now = new Date();
    let trialEndsAt = null;
    let periodEndsAt = null;
    
    if (planId === 'monthly') {
      // For 1 shekel transactions, we treat it as a trial
      if (Number(payload.Amount) <= 1) {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30-day trial
        console.log(`Setting trial end date to ${trialEndsAt.toISOString()}`);
      } else {
        // Regular monthly subscription
        periodEndsAt = new Date(now);
        periodEndsAt.setMonth(periodEndsAt.getMonth() + 1);
        console.log(`Setting period end date to ${periodEndsAt.toISOString()}`);
      }
    } else if (planId === 'annual') {
      periodEndsAt = new Date(now);
      periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
      console.log(`Setting annual period end date to ${periodEndsAt.toISOString()}`);
    } else if (planId === 'vip') {
      // VIP is a lifetime plan, no end date
      console.log('VIP plan - no end date');
    }
    
    // Check if user already has a subscription
    const { data: existingSub, error: subError } = await supabase
      .from('subscriptions')
      .select('id, status, plan_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (subError) {
      console.error('Error checking existing subscription:', subError);
      throw subError;
    }
    
    const cardInfo = {
      lastFourDigits: payload.Last4CardDigits || '0000',
      expiryMonth: payload.CardMonth || '12',
      expiryYear: payload.CardYear || '25'
    };
    
    if (existingSub && existingSub.length > 0) {
      // Update existing subscription
      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_type: planId,
          status: trialEndsAt ? 'trial' : 'active',
          trial_ends_at: trialEndsAt,
          current_period_ends_at: periodEndsAt,
          cancelled_at: null,
          payment_method: cardInfo,
          updated_at: now.toISOString(),
          contract_signed: true
        })
        .eq('id', existingSub[0].id)
        .select();
        
      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw updateError;
      }
      
      console.log('Subscription updated:', updatedSub);
    } else {
      // Create new subscription
      const { data: newSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planId,
          status: trialEndsAt ? 'trial' : 'active',
          trial_ends_at: trialEndsAt,
          current_period_ends_at: periodEndsAt,
          payment_method: cardInfo,
          contract_signed: true,
          contract_signed_at: now.toISOString()
        })
        .select();
        
      if (insertError) {
        console.error('Error creating subscription:', insertError);
        throw insertError;
      }
      
      console.log('New subscription created:', newSub);
    }
  } catch (error) {
    console.error('Error in createOrUpdateSubscription:', error);
    throw error;
  }
}

// Helper function to update payment session
async function updatePaymentSession(supabase, lowProfileId, userId, status, transactionId) {
  try {
    if (!lowProfileId) return;
    
    const { data, error } = await supabase
      .from('payment_sessions')
      .update({
        status: status,
        transaction_id: transactionId,
        updated_at: new Date().toISOString(),
        transaction_data: { 
          transaction_id: transactionId,
          processed_at: new Date().toISOString() 
        }
      })
      .eq('low_profile_id', lowProfileId)
      .select();
      
    if (error) {
      console.error('Error updating payment session:', error);
    } else if (data && data.length > 0) {
      console.log('Payment session updated:', data[0].id);
    } else {
      console.log('No payment session found to update');
    }
  } catch (error) {
    console.error('Error in updatePaymentSession:', error);
  }
}

// Helper function to determine plan type from amount
function getPlanFromAmount(amount) {
  // Convert amount to number if it's a string
  const numAmount = Number(amount);
  
  if (numAmount <= 1) {
    return 'monthly'; // 1₪ transaction for monthly trial
  } else if (numAmount <= 100) {
    return 'monthly'; // Standard monthly plan
  } else if (numAmount <= 900) {
    return 'annual'; // Annual plan
  } else {
    return 'vip'; // VIP plan
  }
}
