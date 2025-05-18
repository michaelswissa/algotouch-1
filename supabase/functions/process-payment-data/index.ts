
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Function to handle payment data processing
serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Create a Supabase client
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
    const { paymentData, userId, source } = await req.json();
    
    console.log(`Processing payment data from ${source} for user: ${userId}`);
    console.log('Payment data:', JSON.stringify(paymentData));

    // Extract token information if available
    const tokenInfo = paymentData.TokenInfo;
    const transactionInfo = paymentData.TranzactionInfo;
    const operation = paymentData.Operation;

    // 1. Update user's subscription status
    if (userId) {
      const { error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: userId,
          status: (operation === "CreateTokenOnly") ? 'trial' : 'active',
          payment_method: 'cardcom',
          // If we have token information and it's a ChareAndCreateToken or CreateTokenOnly operation
          // then store the token in the payment_method column
          payment_details: {
            transaction_id: paymentData.TranzactionId,
            low_profile_id: paymentData.LowProfileId,
            amount: transactionInfo?.Amount || paymentData.Amount || 0,
            response_code: paymentData.ResponseCode,
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
      
      if (subscriptionError) {
        console.error('Error updating user subscription:', subscriptionError);
        throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
      }
    }

    // 2. If we have token info, store it in recurring_payments table
    if (tokenInfo && tokenInfo.Token) {
      console.log(`Storing token for user: ${userId}, token: ${tokenInfo.Token}`);
      
      try {
        // Save the token to recurring_payments
        const { error: tokenError } = await supabaseClient
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
          throw new Error(`Failed to store token: ${tokenError.message}`);
        } else {
          console.log('Token stored successfully');
        }
      } catch (tokenSaveError) {
        console.error('Error in token storage:', tokenSaveError);
        throw tokenSaveError;
      }
    }

    // 3. Log the payment in user_payment_logs
    try {
      const { error: logError } = await supabaseClient
        .from('user_payment_logs')
        .insert({
          user_id: userId,
          subscription_id: userId, // Using user_id as subscription_id as per existing pattern
          token: paymentData.LowProfileId,
          amount: transactionInfo?.Amount || paymentData.Amount || 0,
          status: paymentData.ResponseCode === 0 ? 'payment_success' : 'payment_failed',
          transaction_id: paymentData.TranzactionId?.toString() || null,
          payment_data: {
            operation: operation,
            response_code: paymentData.ResponseCode,
            low_profile_id: paymentData.LowProfileId,
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
        throw new Error(`Failed to log payment: ${logError.message}`);
      }
    } catch (logSaveError) {
      console.error('Error in payment logging:', logSaveError);
      throw logSaveError;
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment data processed successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error processing payment data:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Error processing payment data',
        error: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

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
