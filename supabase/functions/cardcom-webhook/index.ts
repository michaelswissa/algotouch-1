
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
    const { ResponseCode, LowProfileId, TranzactionId, ReturnValue } = payload;
    
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
  
  // Update user's subscription status
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      status: 'active',
      payment_method: 'cardcom',
      last_payment_date: new Date().toISOString(),
      payment_details: {
        transaction_id: payload.TranzactionId,
        low_profile_id: payload.LowProfileId,
        amount: payload.Amount,
        response_code: payload.ResponseCode,
        card_info: {
          last4: payload.Last4CardDigits,
          expiry: `${payload.CardMonth}/${payload.CardYear}`
        }
      }
    });
  
  if (error) {
    console.error('Error updating user subscription:', error);
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
        card_info: {
          last4: payload.Last4CardDigits,
          expiry: `${payload.CardMonth}/${payload.CardYear}`
        }
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', regId);
  
  if (error) {
    console.error('Error updating registration payment status:', error);
  }
}
