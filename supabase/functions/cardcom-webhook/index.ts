
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    // Log the incoming webhook
    console.log('Webhook received from Cardcom');
    
    // Parse the webhook data
    let webhookData;
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        webhookData = await req.json();
      } else {
        // For form-urlencoded or other content types
        const formData = await req.formData();
        webhookData = {};
        for (const [key, value] of formData.entries()) {
          webhookData[key] = value;
        }
      }
    } catch (error) {
      console.error('Error parsing webhook data:', error);
      return new Response(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Parsed webhook data:', webhookData);
    
    // Extract user_id and plan_id from the ReturnValue field (userId_planId_timestamp)
    const returnValue = webhookData.ReturnValue || '';
    let userId = null;
    let planId = null;
    
    if (returnValue) {
      const parts = returnValue.split('_');
      if (parts.length >= 2) {
        userId = parts[0];
        planId = parts[1];
      }
    }
    
    console.log('Extracted from ReturnValue:', { userId, planId });
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check if the payment was successful
    const isSuccess = webhookData.OperationResponse === '0' || 
        (webhookData.TranzactionInfo && webhookData.TranzactionInfo.ResponseCode === 0);
    
    if (isSuccess) {
      console.log(`Payment successful for ReturnValue: ${returnValue}`);
      
      // Extract transaction information
      const transactionId = webhookData.TranzactionInfo?.TranzactionId || 
                           webhookData.InternalDealNumber || 
                           webhookData.TranzactionId || null;
      
      // Record the successful payment
      const { error: paymentLogError } = await supabaseClient
        .from('payment_logs')
        .insert({
          lowprofile_id: webhookData.LowProfileId || returnValue,
          user_id: userId,
          status: 'completed',
          transaction_id: transactionId,
          plan_id: planId,
          payment_data: webhookData
        });
      
      if (paymentLogError) {
        console.error('Error creating payment log:', paymentLogError);
      }
      
      // If we have a user ID and plan ID, update the user's subscription
      if (userId && userId !== 'guest' && planId) {
        try {
          // Calculate subscription details
          const now = new Date();
          let currentPeriodEndsAt = null;
          let trialEndsAt = null;
          let status = 'active';
          
          if (planId === 'annual') {
            const oneYear = new Date(now);
            oneYear.setFullYear(oneYear.getFullYear() + 1);
            currentPeriodEndsAt = oneYear.toISOString();
          } else if (planId === 'monthly') {
            const oneMonth = new Date(now);
            oneMonth.setMonth(oneMonth.getMonth() + 1);
            trialEndsAt = oneMonth.toISOString();
            status = 'trial';
          }
          
          // Extract payment method details
          const paymentMethod = {
            lastFourDigits: webhookData.TranzactionInfo?.Last4CardDigits || 
                            webhookData.Last4CardDigits || 
                            webhookData.CardNumber5 || '****',
            cardType: webhookData.TranzactionInfo?.Brand || 
                      webhookData.Mutag_24 || 
                      webhookData.ExtShvaParams?.Mutag24 || 'unknown'
          };
          
          // Extract token if creating a token was part of the operation
          let paymentTokenId = null;
          if (webhookData.TokenInfo && webhookData.TokenInfo.Token) {
            // Store token in payment_tokens table
            const { data: tokenData, error: tokenError } = await supabaseClient
              .from('payment_tokens')
              .insert({
                user_id: userId,
                token: webhookData.TokenInfo.Token,
                token_expiry: webhookData.TokenInfo.TokenExDate,
                card_last_four: paymentMethod.lastFourDigits,
                card_brand: paymentMethod.cardType
              })
              .select('id')
              .single();
            
            if (tokenError) {
              console.error('Error storing payment token:', tokenError);
            } else if (tokenData) {
              paymentTokenId = tokenData.id;
            }
          }
          
          // Update or create subscription
          const { error: subscriptionError } = await supabaseClient
            .from('subscriptions')
            .upsert({
              user_id: userId,
              plan_type: planId,
              status: status,
              trial_ends_at: trialEndsAt,
              current_period_ends_at: currentPeriodEndsAt,
              payment_method: paymentMethod,
              payment_token_id: paymentTokenId,
              contract_signed: true,
              contract_signed_at: new Date().toISOString()
            });
          
          if (subscriptionError) {
            console.error('Error updating subscription:', subscriptionError);
          }
        } catch (error) {
          console.error('Error updating user subscription:', error);
        }
      }
    } else {
      console.log(`Payment failed for ReturnValue: ${returnValue}`);
      
      // Record the failed payment
      const { error: paymentLogError } = await supabaseClient
        .from('payment_logs')
        .insert({
          lowprofile_id: webhookData.LowProfileId || returnValue,
          user_id: userId,
          status: 'failed',
          plan_id: planId,
          payment_data: webhookData
        });
      
      if (paymentLogError) {
        console.error('Error creating payment log for failed payment:', paymentLogError);
      }
    }
    
    // Acknowledge the webhook
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
