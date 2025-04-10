
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // Create Cardcom client with configuration
    const cardcomTerminal = Deno.env.get('CARDCOM_TERMINAL') || '1000'; // Default to test terminal if not set
    const cardcomApiName = Deno.env.get('CARDCOM_USERNAME') || 'bLaocQRMSnwphQRUVG3b'; // Default test API name
    const cardcomApiPassword = Deno.env.get('CARDCOM_API_PASSWORD') || '';
    const cardcomUrl = 'https://secure.cardcom.solutions';

    // Create a low profile transaction
    if (action === 'create-deal') {
      const { amount, planId, successUrl, errorUrl, webHookUrl, productName, language, operation } = await req.json();

      console.log('Creating low profile deal with:', { 
        amount, planId, operation, language, 
        webhookUrl: webHookUrl || 'Not provided'
      });

      // Default settings
      const defaultReturnUrl = 'https://www.google.com';
      const defaultOperation = "ChargeOnly";

      // Create the request body for Cardcom's LowProfile API
      const createLowProfileRequest = {
        TerminalNumber: parseInt(cardcomTerminal),
        ApiName: cardcomApiName,
        Operation: operation || defaultOperation,
        Amount: parseFloat(amount) || 1,
        WebHookUrl: webHookUrl || defaultReturnUrl,
        ProductName: productName || 'Subscription',
        Language: language || 'he',
        ISOCoinId: 1, // ILS
        FailedRedirectUrl: errorUrl || defaultReturnUrl,
        SuccessRedirectUrl: successUrl || defaultReturnUrl,
        ReturnValue: planId || '',
        Document: {
          Name: "User",
          Products: [
            { 
              ProductID: planId || "subscription", 
              Description: productName || "Subscription", 
              Quantity: 1, 
              UnitCost: parseFloat(amount) || 1
            }
          ],
          IsAllowEditDocument: false,
          IsShowOnlyDocument: false,
          Language: language || 'he'
        }
      };

      // Make request to Cardcom API
      const response = await fetch(`${cardcomUrl}/api/v11/LowProfile/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createLowProfileRequest),
      });

      const data = await response.json();
      
      console.log('Cardcom API response:', {
        success: data.ResponseCode === 0,
        hasLowProfileId: Boolean(data.LowProfileId),
        hasUrl: Boolean(data.Url)
      });

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Check transaction status
    if (action === 'check-status') {
      const { lowProfileCode } = await req.json();

      if (!lowProfileCode) {
        return new Response(JSON.stringify({ 
          error: 'Missing required parameter: lowProfileCode'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const getLowProfileRequest = {
        TerminalNumber: parseInt(cardcomTerminal),
        ApiName: cardcomApiName,
        LowProfileId: lowProfileCode,
      };

      // Make request to Cardcom API to check status
      const response = await fetch(`${cardcomUrl}/api/v11/LowProfile/GetLpResult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(getLowProfileRequest),
      });

      const data = await response.json();
      
      console.log('Transaction status check:', {
        lowProfileCode,
        responseCode: data.ResponseCode,
        operationResponse: data.OperationResponse,
        transactionId: data.TranzactionId || null
      });

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // If no valid action is provided
    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
