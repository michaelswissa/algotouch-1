
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
    
    // Log the webhook data in Supabase
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
    const { 
      ResponseCode, 
      LowProfileId, 
      TranzactionId, 
      ReturnValue,
      TokenInfo,
      TranzactionInfo,
      Operation 
    } = payload;
    
    // Log the webhook data details
    console.log('Processing webhook data:', {
      ResponseCode,
      LowProfileId,
      TranzactionId,
      ReturnValue,
      hasTokenInfo: !!TokenInfo,
      hasTranzactionInfo: !!TranzactionInfo,
      Operation
    });

    // ReturnValue typically contains user ID or registration ID
    if (ReturnValue && ResponseCode === 0) {
      // Check if this is a user ID
      if (ReturnValue.startsWith('temp_reg_')) {
        // This is a temporary registration ID
        await processRegistrationPayment(supabaseClient, ReturnValue, payload);
      } else {
        // This is a user ID
        await processUserPayment(supabaseClient, ReturnValue, payload);
      }
    }

    // Mark webhook as processed
    if (logData && logData.length > 0) {
      await supabaseClient
        .from('payment_webhooks')
        .update({ 
          processed: true,
          processed_at: new Date().toISOString(),
          processing_result: { 
            success: true,
            timestamp: new Date().toISOString(),
            details: `Processed ${Operation} for ReturnValue: ${ReturnValue}`
          }
        })
        .eq('id', logData[0].id);
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
      // If we have token information and it's a ChareAndCreateToken or CreateTokenOnly operation
      // then store the token in the payment_method column
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

// Process payment for temporary registration
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
