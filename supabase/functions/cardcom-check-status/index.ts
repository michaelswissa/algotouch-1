
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
    const { lowProfileId } = await req.json();
    
    if (!lowProfileId) {
      throw new Error('Missing lowProfileId parameter');
    }
    
    console.log('Checking payment status for lowProfileId:', lowProfileId);
    
    // Get Cardcom credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials in environment variables');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query Cardcom API to check transaction status
    const cardcomUrl = 'https://secure.cardcom.solutions/Interface/BillGoldService.asmx/GetLowProfileIndicator';
    const cardcomPayload = {
      terminalNumber: terminalNumber,
      userName: apiName,
      lowProfileCode: lowProfileId,
      codepage: 65001
    };
    
    console.log('Sending request to Cardcom API:', cardcomPayload);
    
    const response = await fetch(cardcomUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardcomPayload),
    });

    if (!response.ok) {
      throw new Error(`Failed to check payment status: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Cardcom API response:', result);
    
    // Find the payment session associated with this lowProfileId
    const { data: session, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('payment_details->lowProfileId', lowProfileId)
      .maybeSingle();

    if (sessionError) {
      console.error('Error finding payment session:', sessionError);
    }

    // If the payment was successful, update the session and create a subscription
    if (result && (result.ResponseCode === 0 || result.OperationResponse === "0")) {
      if (session) {
        // Update session status
        await supabaseClient
          .from('payment_sessions')
          .update({
            payment_details: {
              ...session.payment_details,
              status: 'completed',
              completed_at: new Date().toISOString(),
              transaction_id: result.TranzactionId || result.TranzactionInfo?.TranzactionId || null
            }
          })
          .eq('id', session.id);

        // Handle subscription creation if this was from a registration flow (no user_id but has email)
        // This will be handled by the webhook but we can check and process here as well for redundancy
        if (!session.user_id && session.email) {
          console.log('Payment successful from registration flow, creating user and subscription');
          
          // Create a subscription for the new user
          // This would typically be handled by a webhook that processes registration + payment completion
        }
      }
    }
    
    return new Response(
      JSON.stringify(result),
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
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
