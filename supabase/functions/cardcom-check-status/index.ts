
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
    const requestBody = await req.json();
    const { lowProfileId, planId } = requestBody;
    
    if (!lowProfileId) {
      throw new Error('Missing lowProfileId parameter');
    }
    
    console.log(`Checking payment status for lowProfileId: ${lowProfileId}, planId: ${planId || 'not provided'}`);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Check if there's a payment log record for this lowProfileId
    const { data: paymentLog, error: paymentLogError } = await supabaseClient
      .from('payment_logs')
      .select('*')
      .eq('lowprofile_id', lowProfileId)
      .single();
      
    if (paymentLogError) {
      console.log(`No payment log found for lowProfileId: ${lowProfileId}`);
    }
    
    // Check if there's a payment session for this lowProfileId
    const { data: paymentSession, error: paymentSessionError } = await supabaseClient
      .from('payment_sessions')
      .select('payment_details')
      .filter('payment_details->lowProfileId', 'eq', lowProfileId)
      .single();
      
    if (paymentSessionError) {
      console.log(`No payment session found for lowProfileId: ${lowProfileId}`);
    }
    
    // If we have a completed payment log, return success
    if (paymentLog && paymentLog.status === 'completed') {
      console.log(`Found completed payment log for lowProfileId: ${lowProfileId}`);
      return new Response(
        JSON.stringify({
          ResponseCode: 0,
          Description: "Payment completed successfully",
          paymentLog,
          paymentSession: paymentSession || null
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // If the payment is still processing or has failed, attempt to get status from Cardcom
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "";
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "";
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD") || "";
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials in environment variables');
    }
    
    // Call Cardcom API to check payment status
    const cardcomUrl = "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx";
    const params = new URLSearchParams({
      terminalnumber: terminalNumber,
      username: apiName,
      lowprofilecode: lowProfileId,
      codepage: '65001'
    });
    
    console.log(`Calling Cardcom API to check payment status for lowProfileId: ${lowProfileId}`);
    
    const response = await fetch(`${cardcomUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Cardcom API returned error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const responseData = await response.json();
    console.log(`Received response from Cardcom API:`, responseData);
    
    // Check if payment was successful
    if (responseData.OperationResponse === '0' || 
        (responseData.TranzactionInfo && responseData.TranzactionInfo.ResponseCode === 0)) {
      
      console.log(`Payment successful! Updating database records for lowProfileId: ${lowProfileId}`);
      
      // Update or create payment log
      if (!paymentLog) {
        await supabaseClient
          .from('payment_logs')
          .insert({
            lowprofile_id: lowProfileId,
            status: 'completed',
            plan_id: planId || responseData.plan_id || null,
            transaction_id: responseData.TranzactionInfo?.TranzactionId || null,
            payment_data: responseData
          });
      } else if (paymentLog.status !== 'completed') {
        await supabaseClient
          .from('payment_logs')
          .update({
            status: 'completed',
            transaction_id: responseData.TranzactionInfo?.TranzactionId || null,
            payment_data: responseData
          })
          .eq('id', paymentLog.id);
      }
      
      // Check if user is doing this as part of registration
      if (paymentSession?.payment_details?.isRegistrationFlow && 
          paymentSession?.payment_details?.registrationData) {
        
        console.log('Processing registration flow completion...');
        
        // Complete the registration process if needed
        // Additional logic for registration completion can be added here if needed
      }
    }
    
    // Return the response data
    return new Response(
      JSON.stringify({
        ...responseData,
        paymentLog: paymentLog || null,
        paymentSession: paymentSession?.payment_details || null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({ 
        ResponseCode: -1,
        Description: error instanceof Error ? error.message : 'An unexpected error occurred',
        error: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
