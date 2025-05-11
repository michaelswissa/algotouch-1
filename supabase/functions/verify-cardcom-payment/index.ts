
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// The shape of CardCom API responses
interface CardcomResponse {
  ResponseCode: number;
  Description?: string;
  LowProfileId: string;
  TranzactionId?: number | string;
  ReturnValue?: string;
  Operation?: string;
  TokenInfo?: {
    Token: string;
    TokenExDate: string;
    CardYear?: number;
    CardMonth?: number;
    TokenApprovalNumber?: string;
  };
  TranzactionInfo?: {
    ResponseCode: number;
    TranzactionId: number;
    Amount: number;
    Last4CardDigits: string;
    CardMonth: number;
    CardYear: number;
    ApprovalNumber?: string;
    CardInfo?: string;
  };
}

// Main server function
serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Create a Supabase client with service role for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Parse the request body
    const { lowProfileId } = await req.json();
    
    if (!lowProfileId) {
      throw new Error('Missing lowProfileId parameter');
    }
    
    console.log(`Verifying payment for lowProfileId: ${lowProfileId}`);

    // Get CardCom API credentials from environment variables
    const terminalNumber = Deno.env.get('CARDCOM_TERMINAL');
    const apiName = Deno.env.get('CARDCOM_USERNAME');
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing CardCom configuration');
    }

    // First check if we already have this payment in our database
    console.log('Checking for existing webhook data');
    const { data: existingWebhook, error: webhookError } = await supabaseClient
      .from('payment_webhooks')
      .select('*')
      .eq('payload->LowProfileId', lowProfileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!webhookError && existingWebhook?.processed && existingWebhook?.payload) {
      // We already processed this payment via webhook
      const webhookData = existingWebhook.payload as unknown as CardcomResponse;
      
      if (webhookData.ResponseCode === 0) {
        console.log('Payment already verified via webhook:', existingWebhook.id);
        
        // Extract payment details
        const paymentDetails = webhookData.TranzactionInfo ? {
          transactionId: webhookData.TranzactionInfo.TranzactionId,
          amount: webhookData.TranzactionInfo.Amount,
          cardLastDigits: webhookData.TranzactionInfo.Last4CardDigits,
          approvalNumber: webhookData.TranzactionInfo.ApprovalNumber || '',
          cardType: webhookData.TranzactionInfo.CardInfo || '',
          cardExpiry: `${webhookData.TranzactionInfo.CardMonth}/${webhookData.TranzactionInfo.CardYear}`,
          cardOwnerName: webhookData.TranzactionInfo.CardOwnerName || '',
          cardOwnerEmail: webhookData.TranzactionInfo.CardOwnerEmail || '',
          cardOwnerPhone: webhookData.TranzactionInfo.CardOwnerPhone || ''
        } : undefined;
        
        // Extract token info if available
        const tokenInfo = webhookData.TokenInfo ? {
          token: webhookData.TokenInfo.Token,
          expiryDate: webhookData.TokenInfo.TokenExDate,
          approvalNumber: webhookData.TokenInfo.TokenApprovalNumber || ''
        } : undefined;
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment already verified via webhook',
            paymentDetails,
            tokenInfo,
            source: 'webhook'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      } else {
        throw new Error(`Payment failed with response code: ${webhookData.ResponseCode}, ${webhookData.Description || ''}`);
      }
    }

    // If no webhook data found, call CardCom API to verify payment
    console.log('No webhook data found, calling CardCom API');
    const cardcomResponse = await fetch('https://secure.cardcom.solutions/api/v1/LowProfile/GetLpResult', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        TerminalNumber: terminalNumber,
        ApiName: apiName,
        LowProfileId: lowProfileId
      })
    });
    
    if (!cardcomResponse.ok) {
      throw new Error(`CardCom API error: ${cardcomResponse.status} ${cardcomResponse.statusText}`);
    }
    
    const cardcomData = await cardcomResponse.json() as CardcomResponse;
    console.log('CardCom API response:', JSON.stringify(cardcomData));
    
    if (cardcomData.ResponseCode !== 0) {
      throw new Error(`Payment verification failed: ${cardcomData.Description || 'Unknown error'}`);
    }

    // Save the response to payment_webhooks table for future reference
    const { data: savedWebhook, error: saveError } = await supabaseClient
      .from('payment_webhooks')
      .insert({
        webhook_type: 'cardcom_verification',
        payload: cardcomData,
        processed: true,
        processed_at: new Date().toISOString(),
        processing_result: {
          verification_source: 'api_call',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('Error saving webhook data:', saveError);
      // Continue anyway as this is not critical
    } else {
      console.log('Saved verification data to webhooks table:', savedWebhook.id);
    }

    // Process the payment data (save token, update subscription, etc.)
    if (cardcomData.ReturnValue) {
      const userId = cardcomData.ReturnValue;
      
      try {
        await supabaseClient.functions.invoke('process-payment-data', {
          body: {
            paymentData: cardcomData,
            userId,
            source: 'verify-cardcom-payment'
          }
        });
        console.log(`Payment data processed for user: ${userId}`);
      } catch (processError) {
        console.error('Error processing payment data:', processError);
        // Continue anyway, as we'll still return success to the client
      }
    }

    // Extract payment details for response
    const paymentDetails = cardcomData.TranzactionInfo ? {
      transactionId: cardcomData.TranzactionInfo.TranzactionId,
      amount: cardcomData.TranzactionInfo.Amount,
      cardLastDigits: cardcomData.TranzactionInfo.Last4CardDigits,
      approvalNumber: cardcomData.TranzactionInfo.ApprovalNumber || '',
      cardType: cardcomData.TranzactionInfo.CardInfo || '',
      cardExpiry: `${cardcomData.TranzactionInfo.CardMonth}/${cardcomData.TranzactionInfo.CardYear}`
    } : undefined;
    
    // Extract token info if available
    const tokenInfo = cardcomData.TokenInfo ? {
      token: cardcomData.TokenInfo.Token,
      expiryDate: cardcomData.TokenInfo.TokenExDate,
      approvalNumber: cardcomData.TokenInfo.TokenApprovalNumber || ''
    } : undefined;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified successfully',
        paymentDetails,
        tokenInfo,
        source: 'api_verification'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Error verifying payment',
        error: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
