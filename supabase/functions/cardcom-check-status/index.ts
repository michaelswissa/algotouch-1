
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
      return new Response(
        JSON.stringify({ error: 'Missing lowProfileId parameter' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Checking transaction status for:', lowProfileId);
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Set a timeout for the Cardcom API call
    const timeout = 10000; // 10 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // First check our database to see if we have recorded this payment
      const { data: paymentLog, error: logError } = await supabaseClient
        .from('user_payment_logs')
        .select('*')
        .eq('token', lowProfileId)
        .maybeSingle();
        
      if (logError) {
        console.log('Error checking payment logs:', logError.message);
      }
        
      if (paymentLog) {
        console.log('Found payment log in database:', paymentLog);
        // If we have record of this payment in our database
        clearTimeout(timeoutId);
        return new Response(
          JSON.stringify({ 
            ResponseCode: 0,
            Description: 'Payment found in database',
            status: 'success',
            transaction_id: paymentLog.id,
            webhook_processed: true
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // If not found in our database, check with Cardcom
      const terminalNumber = Deno.env.get('CARDCOM_TERMINAL_NUMBER');
      const apiName = Deno.env.get('CARDCOM_API_NAME');
      
      if (!terminalNumber || !apiName) {
        throw new Error('Missing Cardcom credentials in environment variables');
      }
      
      const cardcomRequest = {
        TerminalNumber: Number(terminalNumber),
        ApiName: apiName,
        LowProfileId: lowProfileId
      };

      // Call Cardcom API to check transaction status with timeout
      const cardcomResponse = await fetch('https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardcomRequest),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!cardcomResponse.ok) {
        throw new Error(`Error calling Cardcom API: ${cardcomResponse.statusText}`);
      }

      const cardcomResult = await cardcomResponse.json();
      console.log('Cardcom API response:', cardcomResult);

      // Check if the payment session exists in our database
      const { data: paymentSession } = await supabaseClient
        .from('payment_sessions')
        .select('*')
        .eq('payment_details->lowProfileId', lowProfileId)
        .maybeSingle();

      // Include payment session info in the response
      return new Response(
        JSON.stringify({
          ...cardcomResult,
          paymentSessionExists: !!paymentSession,
          paymentSessionId: paymentSession?.id || null
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (fetchError) {
      // Clean up the timeout if we hit an error
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Cardcom API request timed out after 10 seconds');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error checking transaction status:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        ResponseCode: 400
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
