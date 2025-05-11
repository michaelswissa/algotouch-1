
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Create a Supabase client with the client's Authorization header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    // Create admin client for operations requiring service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Parse request body
    const { lowProfileId } = await req.json();
    
    // Validate input
    if (!lowProfileId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing lowProfileId parameter'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check if this payment has already been processed by looking in payment logs
    const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .maybeSingle();

    if (existingPayment) {
      console.log('Payment already processed:', existingPayment);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment verified from logs',
          paymentId: existingPayment.id,
          userId: existingPayment.user_id,
          amount: existingPayment.amount,
          status: existingPayment.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if this payment has been processed by webhook but not yet in logs
    const { data: webhookData, error: webhookError } = await supabaseAdmin
      .from('payment_webhooks')
      .select('*')
      .eq('payload->LowProfileId', lowProfileId)
      .maybeSingle();

    if (webhookData && webhookData.payload?.ResponseCode === 0) {
      console.log('Payment found in webhooks:', webhookData);
      // Extract user ID from webhook data
      const userId = webhookData.payload?.ReturnValue;
      
      if (userId && !webhookData.processed) {
        // Process the webhook data now
        try {
          await processWebhookPayload(supabaseAdmin, webhookData.payload);
          
          // Mark webhook as processed
          await supabaseAdmin
            .from('payment_webhooks')
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              processing_result: { 
                success: true,
                source: 'verify-function',
                timestamp: new Date().toISOString() 
              }
            })
            .eq('id', webhookData.id);
        } catch (processError) {
          console.error('Error processing webhook data:', processError);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment verified from webhook',
          userId: userId,
          source: 'webhook'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // If we get here, we need to verify the payment directly with CardCom
    const { data: directVerification, error: directVerificationError } = await verifyWithCardcomApi(lowProfileId);

    if (directVerificationError) {
      throw directVerificationError;
    }

    // Process the verification result
    if (directVerification.ResponseCode === 0) {
      // Extract user ID from verification data
      const userId = directVerification.ReturnValue;
      
      if (userId) {
        // Process the payment data
        try {
          await processWebhookPayload(supabaseAdmin, directVerification);
        } catch (processError) {
          console.error('Error processing direct verification data:', processError);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment verified directly with CardCom',
          userId: userId,
          source: 'direct-api'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Payment verification failed
      return new Response(
        JSON.stringify({
          success: false,
          message: directVerification.Description || 'Payment verification failed',
          errorCode: directVerification.ResponseCode
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Still return 200 for API consistency
        }
      );
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    
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

// Function to verify payment with CardCom API directly
async function verifyWithCardcomApi(lowProfileId: string) {
  try {
    // Get CardCom credentials from environment variables
    const terminalNumber = Deno.env.get('CARDCOM_TERMINAL');
    const apiName = Deno.env.get('CARDCOM_USERNAME');
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing CardCom credentials in environment variables');
    }
    
    // Call CardCom API to get transaction result
    const response = await fetch('https://secure.cardcom.solutions/api/v1/LowProfile/GetLpResult', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        TerminalNumber: terminalNumber,
        ApiName: apiName,
        LowProfileId: lowProfileId
      })
    });
    
    if (!response.ok) {
      throw new Error(`CardCom API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Process webhook payload like the webhook function would
async function processWebhookPayload(supabase: any, payload: any) {
  const {
    ResponseCode,
    LowProfileId,
    TranzactionId,
    ReturnValue,
    TokenInfo,
    TranzactionInfo,
    Operation
  } = payload;
  
  // ReturnValue typically contains user ID or registration ID
  if (ReturnValue && ResponseCode === 0) {
    // Check if this is a user ID
    if (ReturnValue.startsWith('temp_reg_')) {
      // This is a temporary registration ID
      await processRegistrationPayment(supabase, ReturnValue, payload);
    } else {
      // This is a user ID
      await processUserPayment(supabase, ReturnValue, payload);
    }
  }
}

// Process payment for registered user (same as in webhook function)
async function processUserPayment(supabase: any, userId: string, payload: any) {
  console.log(`Processing payment for user: ${userId}`);
  
  // Extract token information if available
  const tokenInfo = payload.TokenInfo;
  const transactionInfo = payload.TranzactionInfo;
  const operation = payload.Operation;

  // Update user's subscription status
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      status: (operation === "CreateTokenOnly") ? 'trial' : 'active',
      payment_method: 'cardcom',
      last_payment_date: new Date().toISOString(),
      payment_details: {
        transaction_id: payload.TranzactionId,
        low_profile_id: payload.LowProfileId,
        amount: transactionInfo?.Amount || payload.Amount || 0,
        response_code: payload.ResponseCode,
        operation: operation,
        card_info: transactionInfo ? {
          last4: transactionInfo.Last4CardDigits,
          expiry: `${transactionInfo.CardMonth}/${transactionInfo.CardYear}`,
          card_name: transactionInfo.CardName,
          card_type: transactionInfo.CardInfo
        } : null,
        token_info: tokenInfo ? {
          token: tokenInfo.Token,
          expiry: tokenInfo.TokenExDate,
          approval: tokenInfo.TokenApprovalNumber
        } : null
      }
    });
  
  if (error) {
    console.error('Error updating user subscription:', error);
  }

  // If we have token info, store it in recurring_payments table
  if (tokenInfo && tokenInfo.Token) {
    console.log(`Storing token for user: ${userId}, token: ${tokenInfo.Token}`);
    
    try {
      // Save the token to recurring_payments
      const { error: tokenError } = await supabase
        .from('recurring_payments')
        .insert({
          user_id: userId,
          token: tokenInfo.Token,
          token_expiry: parseCardcomDateString(tokenInfo.TokenExDate),
          token_approval_number: tokenInfo.TokenApprovalNumber,
          last_4_digits: transactionInfo?.Last4CardDigits || null,
          card_type: transactionInfo?.CardInfo || null,
          status: 'active',
          is_valid: true
        });
        
      if (tokenError) {
        console.error('Error storing token:', tokenError);
      } else {
        console.log('Token stored successfully');
      }
    } catch (tokenSaveError) {
      console.error('Error in token storage:', tokenSaveError);
    }
  }

  // Log the payment in user_payment_logs
  try {
    const { error: logError } = await supabase
      .from('user_payment_logs')
      .insert({
        user_id: userId,
        subscription_id: userId, // Using user_id as subscription_id as per existing pattern
        token: payload.LowProfileId,
        amount: transactionInfo?.Amount || payload.Amount || 0,
        status: payload.ResponseCode === 0 ? 'payment_success' : 'payment_failed',
        transaction_id: payload.TranzactionId?.toString() || null,
        payment_data: {
          operation: operation,
          response_code: payload.ResponseCode,
          low_profile_id: payload.LowProfileId,
          card_info: transactionInfo ? {
            last4: transactionInfo.Last4CardDigits,
            expiry: `${transactionInfo.CardMonth}/${transactionInfo.CardYear}`
          } : null,
          token_info: tokenInfo ? {
            token: tokenInfo.Token,
            expiry: tokenInfo.TokenExDate
          } : null
        }
      });
      
    if (logError) {
      console.error('Error logging payment:', logError);
    }
  } catch (logSaveError) {
    console.error('Error in payment logging:', logSaveError);
  }
}

// Process payment for temporary registration (same as in webhook function)
async function processRegistrationPayment(supabase: any, regId: string, payload: any) {
  console.log(`Processing payment for registration: ${regId}`);
  
  // Mark the payment as verified in the registration data
  const { error } = await supabase
    .from('temp_registration_data')
    .update({ 
      payment_verified: true,
      payment_details: {
        transaction_id: payload.TranzactionId,
        low_profile_id: payload.LowProfileId,
        amount: payload.Amount,
        response_code: payload.ResponseCode,
        card_info: payload.TranzactionInfo ? {
          last4: payload.TranzactionInfo.Last4CardDigits,
          expiry: `${payload.TranzactionInfo.CardMonth}/${payload.TranzactionInfo.CardYear}`
        } : null,
        token_info: payload.TokenInfo ? {
          token: payload.TokenInfo.Token,
          expiry: payload.TokenInfo.TokenExDate,
          approval: payload.TokenInfo.TokenApprovalNumber
        } : null
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', regId);
  
  if (error) {
    console.error('Error updating registration payment status:', error);
  }
}

// Helper function to parse Cardcom date string format (YYYYMMDD) to ISO date
function parseCardcomDateString(dateStr: string): string {
  try {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    // Return in YYYY-MM-DD format
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error parsing date string:', error);
    // Return current date as fallback
    return new Date().toISOString().split('T')[0];
  }
}
