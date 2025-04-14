
import { serve } from "std/http/server.ts";
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
    // Parse webhook data from Cardcom
    let webhookData;
    try {
      webhookData = await req.json();
    } catch (error) {
      // If JSON parsing fails, try to parse form data
      const formData = await req.formData();
      webhookData = Object.fromEntries(formData.entries());
    }

    console.log('Received webhook data:', webhookData);

    // Extract relevant information
    const {
      LowProfileId,
      OperationResponse,
      TranzactionId,
      ReturnValue,
      TokenInfo,
      TranzactionInfo
    } = webhookData;

    if (!LowProfileId) {
      throw new Error('Missing LowProfileId in webhook data');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Check if payment was successful
    const isSuccessful = (OperationResponse === '0' || OperationResponse === 0 || 
      (TranzactionInfo && (TranzactionInfo.ResponseCode === 0 || TranzactionInfo.ResponseCode === '0')));
    
    // Get payment session if it exists
    const { data: paymentSession } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .filter('payment_details->lowProfileId', 'eq', LowProfileId)
      .single();
    
    // Update or insert payment log
    const { data: existingLog } = await supabaseClient
      .from('payment_logs')
      .select('*')
      .eq('lowprofile_id', LowProfileId)
      .maybeSingle();
    
    if (existingLog) {
      // Update existing payment log
      await supabaseClient
        .from('payment_logs')
        .update({
          status: isSuccessful ? 'completed' : 'failed',
          transaction_id: TranzactionId || null,
          payment_data: webhookData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLog.id);
    } else {
      // Create new payment log
      await supabaseClient
        .from('payment_logs')
        .insert({
          lowprofile_id: LowProfileId,
          status: isSuccessful ? 'completed' : 'failed',
          plan_id: paymentSession?.plan_id || ReturnValue, 
          transaction_id: TranzactionId || null,
          payment_data: webhookData,
          user_id: paymentSession?.user_id || null
        });
    }

    // If payment successful and user is in registration flow, complete registration
    if (isSuccessful && paymentSession?.payment_details?.isRegistrationFlow) {
      console.log('Processing successful payment for registration flow...');
      
      // Add additional registration processing here if needed
    }

    // Send success response to Cardcom
    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Webhook processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error processing webhook',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
