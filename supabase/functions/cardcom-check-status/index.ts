
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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
    const { lowProfileId, planId } = await req.json();
    
    if (!lowProfileId) {
      return new Response(
        JSON.stringify({ error: 'Missing lowProfileId parameter' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    console.log('Checking status for lowProfileId:', lowProfileId);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Check if we have a payment log for this profile ID
    const { data: paymentLog } = await supabaseClient
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .maybeSingle();
      
    if (paymentLog) {
      console.log('Found existing payment log:', paymentLog);
      return new Response(
        JSON.stringify({ 
          ...paymentLog,
          ResponseCode: paymentLog.status === 'completed' ? 0 : 1
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Check if we have a payment session for this profile ID
    const { data: paymentSession } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .filter('payment_details->lowProfileId', 'eq', lowProfileId)
      .maybeSingle();
    
    if (paymentSession) {
      console.log('Found payment session:', paymentSession);
      
      // If webhook has processed this payment already
      if (paymentSession.payment_details?.webhookProcessed) {
        const isSuccess = paymentSession.payment_details?.status === 'completed';
        return new Response(
          JSON.stringify({ 
            ResponseCode: isSuccess ? 0 : 1,
            Description: isSuccess ? 'Payment completed' : 'Payment failed',
            paymentSession
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }
    
    // At this point, we need to check with Cardcom directly
    const apiUrl = 'https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult';
    
    const apiBody = {
      TerminalNumber: parseInt(Deno.env.get('CARDCOM_TERMINAL_NUMBER') || '0'),
      ApiName: Deno.env.get('CARDCOM_API_NAME'),
      LowProfileId: lowProfileId
    };
    
    console.log('Checking payment status with Cardcom', apiBody);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiBody)
    });
    
    if (!response.ok) {
      throw new Error(`Cardcom API returned ${response.status}: ${await response.text()}`);
    }
    
    const cardcomData = await response.json();
    console.log('Cardcom API response:', cardcomData);
    
    // Record response in payment log if not already there
    if (!paymentLog) {
      // Check if this transaction was successful
      const isSuccessful = 
        cardcomData.OperationResponse === '0' ||
        cardcomData.ResponseCode === 0 ||
        (cardcomData.TranzactionInfo && cardcomData.TranzactionInfo.ResponseCode === 0);
        
      const paymentLogData = {
        token: lowProfileId,
        status: isSuccessful ? 'completed' : 'failed',
        amount: cardcomData.TranzactionInfo?.Amount || 0,
        approval_code: cardcomData.TranzactionInfo?.ApprovalNumber || null,
        transaction_details: cardcomData
      };
      
      // If payment session exists, add user_id from there
      if (paymentSession && paymentSession.user_id) {
        paymentLogData.user_id = paymentSession.user_id;
      }
      
      // Save payment log
      await supabaseClient
        .from('user_payment_logs')
        .insert(paymentLogData);
        
      console.log('Created payment log:', paymentLogData);
      
      // If there's a payment session, update it
      if (paymentSession) {
        await supabaseClient
          .from('payment_sessions')
          .update({
            payment_details: {
              ...paymentSession.payment_details,
              status: isSuccessful ? 'completed' : 'failed',
              cardcomData,
              checkedAt: new Date().toISOString()
            }
          })
          .eq('id', paymentSession.id);
          
        console.log('Updated payment session with check status');
      }
    }
    
    return new Response(
      JSON.stringify(cardcomData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        ResponseCode: 1,
        Description: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
