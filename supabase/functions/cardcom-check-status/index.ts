
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

    // First check if we already have this payment recorded through the webhook
    const { data: paymentLog } = await supabaseClient
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .maybeSingle();
      
    if (paymentLog && paymentLog.status === 'completed') {
      console.log('Payment already processed via webhook:', paymentLog);
      return new Response(
        JSON.stringify({ 
          ResponseCode: 0, 
          Description: "Payment already processed", 
          OperationResponse: "0",
          paymentAlreadyProcessed: true,
          status: 'completed',
          TranzactionId: paymentLog.transaction_details?.TranzactionId || null
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

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

    // If the payment was successful, update the session status
    if (result && (result.ResponseCode === 0 || result.OperationResponse === "0")) {
      if (session) {
        // Extract payment method details for subscription
        let paymentMethod = {};
        
        if (result.TokenInfo) {
          // Extract token for recurring payments
          paymentMethod = {
            token: result.TokenInfo.Token,
            tokenExpiryDate: result.TokenInfo.TokenExDate,
            lastFourDigits: result.TranzactionInfo?.Last4CardDigits?.toString() || 
                            result.TranzactionInfo?.Last4CardDigitsString || '',
            cardHolderName: result.UIValues?.CardOwnerName || '',
            cardHolderEmail: result.UIValues?.CardOwnerEmail || '',
            cardHolderPhone: result.UIValues?.CardOwnerPhone || ''
          };
        } else if (result.TranzactionInfo) {
          // Extract card details for one-time payments
          paymentMethod = {
            lastFourDigits: result.TranzactionInfo.Last4CardDigits?.toString() || 
                            result.TranzactionInfo.Last4CardDigitsString || '',
            cardHolderName: result.UIValues?.CardOwnerName || 
                            result.TranzactionInfo.CardOwnerName || '',
            cardBrand: result.TranzactionInfo.Brand || '',
            approvalNumber: result.TranzactionInfo.ApprovalNumber || ''
          };
        }
        
        // Extract transaction details
        const transactionId = result.TranzactionId || result.TranzactionInfo?.TranzactionId;
        const approvalNumber = 
          result.TranzactionInfo?.ApprovalNumber || 
          result.TokenInfo?.TokenApprovalNumber || 
          '';
        
        // Update session status
        await supabaseClient
          .from('payment_sessions')
          .update({
            payment_details: {
              ...session.payment_details,
              status: 'completed',
              completed_at: new Date().toISOString(),
              transaction_id: transactionId,
              approval_number: approvalNumber,
              payment_method: paymentMethod
            }
          })
          .eq('id', session.id);

        // Log the payment in user_payment_logs if it hasn't been logged yet
        if (!paymentLog) {
          await supabaseClient
            .from('user_payment_logs')
            .insert({
              user_id: session.user_id || null,
              token: lowProfileId,
              amount: session.payment_details.amount || 0,
              approval_code: approvalNumber,
              status: 'completed',
              transaction_details: result
            });
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
