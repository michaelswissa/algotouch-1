
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
    const { lowProfileId, planId } = await req.json();
    
    if (!lowProfileId) {
      throw new Error("Missing required parameter: lowProfileId");
    }

    console.log(`Checking payment status for lowProfileId: ${lowProfileId}, planId: ${planId || 'not specified'}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Cardcom credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials in environment variables');
    }

    // First, check if we have a payment session for this lowProfileId
    const { data: paymentSessionData, error: paymentSessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('payment_details->lowProfileId', lowProfileId)
      .maybeSingle();

    if (paymentSessionError) {
      console.error('Error checking payment session:', paymentSessionError);
    }

    if (paymentSessionData) {
      console.log('Found payment session:', {
        id: paymentSessionData.id,
        email: paymentSessionData.email,
        user_id: paymentSessionData.user_id,
        plan_id: paymentSessionData.plan_id,
      });
    } else {
      console.log('No payment session found for lowProfileId:', lowProfileId);
    }

    // Next, check payment logs to see if this payment was already processed
    const { data: paymentLogData, error: paymentLogError } = await supabaseClient
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .maybeSingle();

    if (paymentLogError) {
      console.error('Error checking payment logs:', paymentLogError);
    }

    if (paymentLogData) {
      console.log('Found existing payment log:', {
        id: paymentLogData.id, 
        status: paymentLogData.status,
        user_id: paymentLogData.user_id
      });
      
      // If payment was already processed successfully, return the data
      if (paymentLogData.status === 'completed') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment already processed',
            ResponseCode: 0,
            payment: paymentLogData,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // No existing payment found or payment not completed, check with Cardcom API
    console.log('Checking payment status with Cardcom API...');

    // Build Cardcom API URL (Name to Value interface)
    const params = new URLSearchParams();
    params.append('terminalnumber', terminalNumber);
    params.append('username', apiName);
    params.append('lowprofilecode', lowProfileId);

    // Make the request to Cardcom API
    const cardcomUrl = `https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx`;
    const cardcomResponse = await fetch(`${cardcomUrl}?${params.toString()}`, {
      method: 'GET',
    });

    if (!cardcomResponse.ok) {
      throw new Error(`Cardcom API error: ${cardcomResponse.status} ${cardcomResponse.statusText}`);
    }

    // Parse the response - could be XML or JSON
    const responseText = await cardcomResponse.text();
    let responseData: any = {};

    // If XML, convert to JSON
    if (responseText.trim().startsWith('<')) {
      console.log('Received XML response from Cardcom');
      // Simple XML to JSON conversion (for most common fields)
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, "text/xml");
      
      // Extract key fields
      const operationResponse = xmlDoc.querySelector('OperationResponse')?.textContent || '';
      const dealResponse = xmlDoc.querySelector('DealResponse')?.textContent || '';
      const internalDealNumber = xmlDoc.querySelector('InternalDealNumber')?.textContent || '';
      const returnValue = xmlDoc.querySelector('ReturnValue')?.textContent || '';
      
      responseData = {
        OperationResponse: operationResponse,
        DealResponse: dealResponse,
        InternalDealNumber: internalDealNumber,
        ReturnValue: returnValue,
        ResponseCode: operationResponse === '0' ? 0 : parseInt(operationResponse) || 1
      };
    } else {
      // Try to parse as JSON
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing Cardcom response:', e);
        console.log('Response text:', responseText);
        throw new Error('Invalid response format from Cardcom API');
      }
    }

    console.log('Cardcom API response:', responseData);

    // Check if payment was successful
    const isSuccess = 
      responseData.ResponseCode === 0 || 
      responseData.OperationResponse === '0' || 
      (responseData.TranzactionInfo && responseData.TranzactionInfo.ResponseCode === 0);

    if (isSuccess) {
      console.log('Payment successful! Recording in database...');

      // If payment session exists, update it with success status
      if (paymentSessionData) {
        await supabaseClient
          .from('payment_sessions')
          .update({
            payment_details: {
              ...paymentSessionData.payment_details,
              status: 'completed',
              cardcomResponse: responseData,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', paymentSessionData.id);
      }

      // If payment log doesn't exist yet, create it
      if (!paymentLogData) {
        await supabaseClient
          .from('user_payment_logs')
          .insert({
            token: lowProfileId,
            status: 'completed',
            user_id: paymentSessionData?.user_id || null,
            amount: responseData.TranzactionInfo?.Amount || paymentSessionData?.payment_details?.amount || 0,
            approval_code: responseData.TranzactionInfo?.ApprovalNumber || null,
            transaction_details: {
              cardcomResponse: responseData,
              planId: planId || paymentSessionData?.plan_id,
              sessionId: paymentSessionData?.id
            }
          });
      } else if (paymentLogData.status !== 'completed') {
        // Update existing payment log if not already marked as completed
        await supabaseClient
          .from('user_payment_logs')
          .update({
            status: 'completed',
            approval_code: responseData.TranzactionInfo?.ApprovalNumber || null,
            transaction_details: {
              ...paymentLogData.transaction_details,
              cardcomResponse: responseData,
              planId: planId || paymentSessionData?.plan_id
            }
          })
          .eq('id', paymentLogData.id);
      }
    } else {
      console.log('Payment not successful or still pending.');
      
      // Record payment error if needed
      if (responseData.ResponseCode !== 0 && !paymentLogData) {
        await supabaseClient
          .from('payment_errors')
          .insert({
            user_id: paymentSessionData?.user_id || 'unknown',
            error_code: responseData.ResponseCode?.toString() || 'unknown',
            error_message: responseData.Description || 'Unknown error',
            error_details: responseData,
            context: `cardcom-check-status for lowProfileId: ${lowProfileId}`,
            payment_details: paymentSessionData?.payment_details || {}
          });
      }
    }

    return new Response(
      JSON.stringify(responseData),
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
