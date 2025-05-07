
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

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
    
    // Log the webhook data in Supabase for all received webhooks
    const { data: logData, error: logError } = await supabaseClient
      .from('payment_webhooks')
      .insert({
        webhook_type: 'cardcom',
        payload: payload,
        processed: false
      });
    
    if (logError) {
      console.error('Error logging webhook:', logError);
    }
    
    // Process the webhook based on the payload data
    // CardCom webhook contains information about the transaction
    const { ResponseCode, LowProfileId, TranzactionId, ReturnValue, Operation } = payload;
    
    console.log(`Processing webhook: Operation=${Operation}, ResponseCode=${ResponseCode}, ReturnValue=${ReturnValue}`);
    
    // Validate the response based on operation type
    if (ResponseCode === 0) {
      // Successful transaction
      console.log(`Payment successful for LowProfileId: ${LowProfileId}, Operation: ${Operation}`);
      
      try {
        // Validate operation-specific responses
        switch (Operation) {
          case 'CreateTokenOnly':
            // Monthly plan - should have TokenInfo but no transaction
            if (!payload.TokenInfo || !payload.TokenInfo.Token) {
              console.error('CreateTokenOnly operation missing TokenInfo.Token!');
              throw new Error('Missing TokenInfo for CreateTokenOnly operation');
            }
            console.log('Successfully created token for future billing:', payload.TokenInfo.Token);
            break;
            
          case 'ChargeAndCreateToken':
            // Annual plan - should have both TokenInfo and TransactionInfo
            if (!payload.TokenInfo || !payload.TokenInfo.Token) {
              console.error('ChargeAndCreateToken operation missing TokenInfo.Token!');
              throw new Error('Missing TokenInfo for ChargeAndCreateToken operation');
            }
            if (!payload.TranzactionInfo || !payload.TranzactionInfo.Amount) {
              console.error('ChargeAndCreateToken operation missing TransactionInfo!');
              throw new Error('Missing TransactionInfo for ChargeAndCreateToken operation');
            }
            console.log(`Successfully charged ${payload.TranzactionInfo.Amount} and created token for future billing:`, payload.TokenInfo.Token);
            break;
            
          case 'ChargeOnly':
            // VIP plan - should have TransactionInfo but no token
            if (!payload.TranzactionInfo || !payload.TranzactionInfo.Amount) {
              console.error('ChargeOnly operation missing TransactionInfo!');
              throw new Error('Missing TransactionInfo for ChargeOnly operation');
            }
            console.log(`Successfully charged one-time payment of ${payload.TranzactionInfo.Amount}`);
            // There should not be a token for ChargeOnly operations
            if (payload.TokenInfo && payload.TokenInfo.Token) {
              console.warn('Warning: ChargeOnly operation returned TokenInfo which was not expected');
            }
            break;
            
          default:
            console.warn(`Unknown operation type: ${Operation}`);
        }
      } catch (validationError) {
        console.error('Validation error:', validationError);
        // Log the validation error but still continue processing
      }
    }
    
    // ReturnValue typically contains user ID or registration ID
    if (ReturnValue && ResponseCode === 0) {
      // Check if this is a user ID
      if (ReturnValue.startsWith('temp_reg_')) {
        // This is a temporary registration ID
        console.log('Processing registration payment with ID:', ReturnValue);
        await processRegistrationPayment(supabaseClient, ReturnValue, payload);
      } else {
        // This is a user ID
        console.log('Processing user payment with ID:', ReturnValue);
        await processUserPayment(supabaseClient, ReturnValue, payload);
      }
    }

    // Acknowledge receipt of webhook
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received and processed' 
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    
    // Still return 200 to acknowledge receipt (webhook best practice)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error processing webhook',
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200, // Always return 200 for webhooks
      }
    );
  }
});

// Process payment for registered user
async function processUserPayment(supabase: any, userId: string, payload: any) {
  console.log(`Processing payment for user: ${userId}`);
  
  try {
    // Determine plan type based on Operation
    let planType = "monthly"; // Default
    
    if (payload.Operation === 'ChargeAndCreateToken') {
      planType = 'annual';
    } else if (payload.Operation === 'ChargeOnly') {
      planType = 'vip';
    }
    
    // Check if there's Token data to save
    const paymentMethodData: any = {
      transaction_id: payload.TranzactionId,
      low_profile_id: payload.LowProfileId,
      amount: payload.TranzactionInfo?.Amount,
      card_info: {
        last4: payload.TranzactionInfo?.Last4CardDigits,
        expiry: `${payload.TranzactionInfo?.CardMonth}/${payload.TranzactionInfo?.CardYear}`
      }
    };
    
    // Add token information for subscription plans
    if ((payload.Operation === 'CreateTokenOnly' || payload.Operation === 'ChargeAndCreateToken') && payload.TokenInfo) {
      paymentMethodData.token = payload.TokenInfo.Token;
      paymentMethodData.token_expiry = payload.TokenInfo.TokenExDate;
      paymentMethodData.token_approval = payload.TokenInfo.TokenApprovalNumber;
    }
    
    // Calculate subscription period end dates
    const now = new Date();
    let trialEndsAt = null;
    let currentPeriodEndsAt = null;
    
    switch (planType) {
      case 'monthly':
        // Monthly plan has 30-day trial, then monthly billing
        trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        currentPeriodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'annual':
        // Annual plan has immediate billing, then yearly renewal
        currentPeriodEndsAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        break;
      case 'vip':
        // VIP plan is a one-time payment, no renewal
        currentPeriodEndsAt = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate()); // Set far in the future
        break;
    }
    
    // Update user's subscription status
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: planType === 'monthly' ? 'trial' : 'active',
        plan_type: planType,
        payment_method: paymentMethodData,
        trial_ends_at: trialEndsAt,
        current_period_ends_at: currentPeriodEndsAt,
        last_payment_date: new Date().toISOString(),
        token: paymentMethodData.token || null,
        token_expires_ym: paymentMethodData.token_expiry || null
      });
    
    if (error) {
      console.error('Error updating user subscription:', error);
    } else {
      console.log(`Successfully updated subscription for user ${userId} with plan ${planType}`);
    }
    
    // Also log the payment in payment_logs table
    const { error: logError } = await supabase
      .from('payment_logs')
      .insert({
        user_id: userId,
        transaction_id: payload.TranzactionId?.toString() || null,
        amount: payload.TranzactionInfo?.Amount || 0,
        payment_status: 'completed',
        plan_id: planType,
        payment_data: payload
      });
      
    if (logError) {
      console.error('Error logging payment:', logError);
    }
  } catch (error: any) {
    console.error('Error processing user payment:', error);
  }
}

// Process payment for temporary registration
async function processRegistrationPayment(supabase: any, regId: string, payload: any) {
  console.log(`Processing payment for registration: ${regId}`);
  
  try {
    // Create payment details to store
    const paymentDetails: any = {
      transaction_id: payload.TranzactionId,
      low_profile_id: payload.LowProfileId,
      amount: payload.TranzactionInfo?.Amount || 0,
      response_code: payload.ResponseCode,
      operation: payload.Operation,
      processed_at: new Date().toISOString(),
      card_info: {
        last4: payload.TranzactionInfo?.Last4CardDigits || '',
        expiry: payload.TranzactionInfo ? `${payload.TranzactionInfo.CardMonth}/${payload.TranzactionInfo.CardYear}` : ''
      }
    };
    
    // Add token information if available
    if (payload.TokenInfo && payload.TokenInfo.Token) {
      paymentDetails.token_info = {
        token: payload.TokenInfo.Token,
        expiry_date: payload.TokenInfo.TokenExDate,
        approval_number: payload.TokenInfo.TokenApprovalNumber
      };
    }
    
    // Mark the payment as verified in the registration data
    const { error } = await supabase
      .from('temp_registration_data')
      .update({ 
        payment_verified: true,
        payment_details: paymentDetails,
        updated_at: new Date().toISOString()
      })
      .eq('id', regId);
    
    if (error) {
      console.error('Error updating registration payment status:', error);
    } else {
      console.log(`Successfully updated payment status for registration ${regId}`);
    }
  } catch (error: any) {
    console.error('Error processing registration payment:', error);
  }
}
