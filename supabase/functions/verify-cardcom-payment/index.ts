
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

// Logger function for edge function
async function logPaymentEvent(
  supabaseClient: any, 
  level: string, 
  message: string, 
  context: string, 
  data: any,
  userId?: string,
  transactionId?: string
) {
  try {
    await supabaseClient
      .from('payment_logs')
      .insert({
        level,
        message,
        context,
        payment_data: data || {},
        user_id: userId || 'system',
        transaction_id: transactionId || 'none',
        source: 'edge-function'
      });
  } catch (error) {
    // Fallback to console logging if database logging fails
    console.error('Error logging to database:', error);
    console.log(`[${level}] [${context}] ${message}`, data);
  }
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

  const requestStartTime = Date.now();
  let supabaseClient;

  try {
    // Create a Supabase client with service role for admin access
    supabaseClient = createClient(
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
    
    await logPaymentEvent(
      supabaseClient, 
      'info', 
      `Verifying payment for lowProfileId: ${lowProfileId}`,
      'verify-cardcom-payment',
      { lowProfileId }
    );

    // Get CardCom API credentials from environment variables
    const terminalNumber = Deno.env.get('CARDCOM_TERMINAL');
    const apiName = Deno.env.get('CARDCOM_USERNAME');
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing CardCom configuration');
    }

    // First check if we already have this payment in our database
    await logPaymentEvent(
      supabaseClient, 
      'info', 
      'Checking for existing webhook data',
      'verify-cardcom-payment',
      { lowProfileId }
    );

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
        await logPaymentEvent(
          supabaseClient, 
          'info', 
          `Payment already verified via webhook: ${existingWebhook.id}`,
          'verify-cardcom-payment',
          { 
            lowProfileId,
            webhookId: existingWebhook.id,
            responseCode: webhookData.ResponseCode
          },
          webhookData.ReturnValue,
          webhookData.TranzactionId?.toString()
        );
        
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
    await logPaymentEvent(
      supabaseClient, 
      'info', 
      'No webhook data found, calling CardCom API',
      'verify-cardcom-payment',
      { lowProfileId }
    );

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
    
    await logPaymentEvent(
      supabaseClient, 
      'info', 
      'CardCom API response received',
      'verify-cardcom-payment',
      { 
        lowProfileId,
        responseCode: cardcomData.ResponseCode,
        description: cardcomData.Description
      },
      cardcomData.ReturnValue,
      cardcomData.TranzactionId?.toString()
    );
    
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
      await logPaymentEvent(
        supabaseClient,
        'error',
        'Error saving webhook data',
        'verify-cardcom-payment',
        { lowProfileId, error: saveError },
        cardcomData.ReturnValue
      );
      // Continue anyway as this is not critical
    } else {
      await logPaymentEvent(
        supabaseClient,
        'info',
        `Saved verification data to webhooks table: ${savedWebhook.id}`,
        'verify-cardcom-payment',
        { lowProfileId, webhookId: savedWebhook.id },
        cardcomData.ReturnValue
      );
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
        
        await logPaymentEvent(
          supabaseClient,
          'info',
          `Payment data processed for user: ${userId}`,
          'verify-cardcom-payment',
          { lowProfileId },
          userId,
          cardcomData.TranzactionId?.toString()
        );
      } catch (processError) {
        await logPaymentEvent(
          supabaseClient,
          'error',
          'Error processing payment data',
          'verify-cardcom-payment',
          { 
            lowProfileId, 
            error: processError instanceof Error ? processError.message : String(processError) 
          },
          userId
        );
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

    // Log total execution time
    const executionTime = Date.now() - requestStartTime;
    await logPaymentEvent(
      supabaseClient,
      'success',
      `Payment verification completed successfully in ${executionTime}ms`,
      'verify-cardcom-payment',
      { 
        lowProfileId, 
        executionTime,
        transactionId: cardcomData.TranzactionId
      },
      cardcomData.ReturnValue,
      cardcomData.TranzactionId?.toString()
    );

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
    // Log error with details
    if (supabaseClient) {
      await logPaymentEvent(
        supabaseClient,
        'error',
        `Error verifying payment: ${error.message || 'Unknown error'}`,
        'verify-cardcom-payment',
        { error: error.message || String(error) }
      );
    } else {
      console.error('Error verifying payment:', error);
    }
    
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
