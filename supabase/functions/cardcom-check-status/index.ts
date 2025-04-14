
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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
    const requestBody = await req.json();
    const { lowProfileId, planId } = requestBody;
    
    if (!lowProfileId) {
      throw new Error('Missing lowProfileId parameter');
    }
    
    console.log(`Checking payment status for lowProfileId: ${lowProfileId}, planId: ${planId || 'not provided'}`);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check if there's a payment log record for this lowProfileId
    const { data: paymentLog } = await supabaseClient
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .maybeSingle();
      
    // Check if there's a payment session for this lowProfileId
    const { data: paymentSession } = await supabaseClient
      .from('payment_sessions')
      .select('payment_details')
      .filter('payment_details->lowProfileId', 'eq', lowProfileId)
      .maybeSingle();
      
    // If we have a completed payment log, return success
    if (paymentLog && paymentLog.status === 'completed') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          message: 'Payment completed successfully',
          paymentLog,
          paymentSession: paymentSession || null
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // If the payment has failed, return error
    if (paymentLog && paymentLog.status === 'failed') {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          message: 'Payment failed',
          paymentLog,
          paymentSession: paymentSession || null
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Use 200 even for failed payments to avoid confusing the client
        }
      );
    }
    
    // If we don't have a payment log or it's still processing, check with Cardcom directly
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    // Call Cardcom API to check payment status
    const cardcomUrl = "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx";
    const params = new URLSearchParams({
      terminalnumber: terminalNumber,
      username: apiName,
      lowprofilecode: lowProfileId,
      codepage: '65001'
    });
    
    console.log(`Calling Cardcom API to check payment status`);
    
    const response = await fetch(`${cardcomUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Cardcom API returned error: ${response.status} ${response.statusText}`);
    }
    
    try {
      // Parse the response
      const responseData = await response.json();
      console.log(`Received response from Cardcom API:`, responseData);
      
      // Check if payment was successful
      const isSuccessful = responseData.OperationResponse === '0' || 
        (responseData.TranzactionInfo && responseData.TranzactionInfo.ResponseCode === 0);
      
      if (isSuccessful) {
        console.log('Payment confirmed successful by Cardcom API');
        
        // Update or create payment log
        if (!paymentLog) {
          await supabaseClient
            .from('user_payment_logs')
            .insert({
              token: lowProfileId,
              status: 'completed',
              plan_id: planId || null,
              transaction_id: responseData.TranzactionInfo?.TranzactionId || null,
              payment_data: responseData
            });
        } else if (paymentLog.status !== 'completed') {
          await supabaseClient
            .from('user_payment_logs')
            .update({
              status: 'completed',
              transaction_id: responseData.TranzactionInfo?.TranzactionId || null,
              payment_data: responseData
            })
            .eq('token', lowProfileId);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            status: 'completed',
            message: 'Payment completed successfully',
            cardcomData: responseData,
            paymentSession: paymentSession?.payment_details || null
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else {
        console.log('Payment reported as failed by Cardcom API');
        
        return new Response(
          JSON.stringify({
            success: false,
            status: 'failed',
            message: responseData.Description || 'Payment failed',
            cardcomData: responseData,
            paymentSession: paymentSession?.payment_details || null
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    } catch (parseError) {
      console.error('Error parsing Cardcom response:', parseError);
      
      return new Response(
        JSON.stringify({
          success: false,
          status: 'unknown',
          message: 'Could not determine payment status',
          error: parseError instanceof Error ? parseError.message : 'Error parsing Cardcom response'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        status: 'error',
        message: 'Error checking payment status',
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
