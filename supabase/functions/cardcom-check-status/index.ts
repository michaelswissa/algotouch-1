
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const requestData = await req.json();
    const { lowProfileId, planId } = requestData;
    
    if (!lowProfileId && !planId) {
      throw new Error('Missing required parameters: lowProfileId or planId is required');
    }
    
    console.log('Checking payment status for:', { lowProfileId, planId });
    
    // Get the Cardcom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // First, check if we have a payment log for this transaction
    const { data: paymentLog, error: paymentLogError } = await supabaseClient
      .from('payment_logs')
      .select('*')
      .eq('lowprofile_id', lowProfileId)
      .order('created_at', { ascending: false })
      .maybeSingle();
    
    if (paymentLog && paymentLog.status === 'completed') {
      console.log('Found completed payment log:', paymentLog);
      return new Response(
        JSON.stringify({ 
          ResponseCode: 0, 
          paymentLog,
          message: 'Payment was successful' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // If no payment log was found or payment failed, check with Cardcom
    if (lowProfileId) {
      try {
        // Prepare parameters for LowProfile status check
        const params = new URLSearchParams({
          terminalnumber: terminalNumber,
          username: apiName,
          lowprofilecode: lowProfileId
        });
        
        // Call Cardcom API to check transaction status
        const cardcomResponse = await fetch(
          `https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx?${params.toString()}`,
          { method: 'GET' }
        );
        
        if (!cardcomResponse.ok) {
          throw new Error(`Cardcom API error: ${cardcomResponse.status} ${cardcomResponse.statusText}`);
        }
        
        const cardcomData = await cardcomResponse.json();
        console.log('Cardcom status response:', cardcomData);
        
        // Return the Cardcom response directly
        return new Response(
          JSON.stringify(cardcomData),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error) {
        console.error('Error checking with Cardcom:', error);
        throw error;
      }
    }
    
    // If we can't find a payment record and couldn't check with Cardcom
    throw new Error('Could not verify payment status');
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
