
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
        JSON.stringify({ error: 'Missing lowProfileId parameter', success: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log('Checking payment status for lowProfileId:', lowProfileId);
    
    // First check if we already have a payment record
    const { data: paymentLog, error: paymentError } = await supabaseClient
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .maybeSingle();
    
    if (paymentError) {
      throw new Error(`Error fetching payment log: ${paymentError.message}`);
    }
    
    if (paymentLog && paymentLog.status === 'completed') {
      console.log('Payment already completed in our records', paymentLog);
      return new Response(
        JSON.stringify({
          ResponseCode: 0,
          Description: "Transaction completed successfully",
          TranzactionInfo: paymentLog.transaction_details,
          LowProfileId: lowProfileId,
          OperationResponse: "0"
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Get the payment session info
    const { data: session, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('payment_details->lowProfileId', lowProfileId)
      .maybeSingle();
    
    if (sessionError) {
      throw new Error(`Error fetching session: ${sessionError.message}`);
    }
    
    if (!session) {
      throw new Error('Payment session not found');
    }
    
    // Get Cardcom credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }

    // Call Cardcom API to get transaction status
    const queryParams = new URLSearchParams({
      TerminalNumber: terminalNumber,
      UserName: apiName,
      LowProfileCode: lowProfileId
    });

    const cardcomUrl = `https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx?${queryParams}`;
    
    console.log('Querying Cardcom API:', cardcomUrl);
    
    const response = await fetch(cardcomUrl);
    
    if (!response.ok) {
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received Cardcom API response:', data);
    
    // Check if transaction was successful
    if ((data.ResponseCode === 0 || data.OperationResponse === '0') && data.TranzactionInfo) {
      // Transaction was successful, update our records if not already updated by webhook
      if (!paymentLog) {
        console.log('Payment not yet recorded, saving transaction details');
        
        await supabaseClient
          .from('user_payment_logs')
          .insert({
            user_id: session.user_id,
            token: lowProfileId,
            amount: session.payment_details?.amount || 0,
            status: 'completed',
            approval_code: data.TranzactionInfo?.ApprovalNumber || '',
            transaction_details: data.TranzactionInfo
          });
      }
      
      // Update session
      await supabaseClient
        .from('payment_sessions')
        .update({
          expires_at: new Date().toISOString(),
          payment_details: {
            ...session.payment_details,
            status: 'completed',
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', session.id);
    }
    
    return new Response(
      JSON.stringify(data),
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
