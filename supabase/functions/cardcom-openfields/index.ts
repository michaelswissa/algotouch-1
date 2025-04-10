
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

// Function to fetch configuration
function getConfig() {
  return {
    apiName: Deno.env.get('CARDCOM_USERNAME') || '',
    cardcomUrl: 'https://secure.cardcom.solutions',
    terminalNumber: Number(Deno.env.get('CARDCOM_TERMINAL') || '0'),
  };
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const config = getConfig();
    
    // Validate config
    if (!config.apiName || !config.terminalNumber) {
      throw new Error('Missing Cardcom configuration. Please set CARDCOM_USERNAME and CARDCOM_TERMINAL in Supabase secrets.');
    }

    // Create a Low Profile deal with Cardcom
    if (path === 'create-deal') {
      const { amount, planId, productName, language, operation, successUrl, errorUrl } = await req.json();
      
      console.log('Creating Low Profile deal:', { amount, planId, operation });
      
      const createLPRequest = {
        TerminalNumber: config.terminalNumber,
        ApiName: config.apiName,
        Operation: operation || "ChargeOnly",
        Amount: amount,
        WebHookUrl: "https://webhook.site/your-webhook-id", // Replace with your actual webhook URL in production
        ProductName: productName || 'Subscription Payment',
        Language: language || 'he',
        ISOCoinId: 1, // ILS
        FailedRedirectUrl: errorUrl || "https://example.com/payment-failed",
        SuccessRedirectUrl: successUrl || "https://example.com/payment-success",
        Document: {
          Name: "User",
          Products: [{ 
            ProductID: planId || "subscription", 
            Description: productName || "Subscription", 
            Quantity: 1, 
            UnitCost: amount, 
            TotalLineCost: amount 
          }],
          IsAllowEditDocument: false,
          IsShowOnlyDocument: false,
          Language: language || 'he'
        }
      };
      
      const body = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createLPRequest),
      };
      
      console.log('Sending request to Cardcom:', createLPRequest);
      
      const results = await fetch(`${config.cardcomUrl}/api/v11/LowProfile/create`, body);
      const json = await results.json();
      
      console.log('Response from Cardcom:', json);
      
      return new Response(
        JSON.stringify(json),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Check transaction status
    if (path === 'check-status') {
      const { lowProfileCode } = await req.json();
      
      if (!lowProfileCode) {
        return new Response(
          JSON.stringify({ error: 'Missing lowProfileCode' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      const getLowProfileRequest = {
        TerminalNumber: config.terminalNumber,
        ApiName: config.apiName,
        LowProfileId: lowProfileCode
      };
      
      const body = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getLowProfileRequest),
      };
      
      console.log('Checking transaction status:', { lowProfileCode });
      
      const results = await fetch(`${config.cardcomUrl}/api/v11/LowProfile/GetLpResult`, body);
      const json = await results.json();
      
      console.log('Transaction status response:', json);
      
      return new Response(
        JSON.stringify(json),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // If no valid path is provided
    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
