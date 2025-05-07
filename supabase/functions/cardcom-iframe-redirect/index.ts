
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

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
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Parse request body
    const body = await req.json();
    
    // Get origin for redirect URLs
    const origin = body.origin || Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    
    // Extract required parameters from the request
    const {
      terminalNumber = Deno.env.get('CARDCOM_TERMINAL'),
      apiName = Deno.env.get('CARDCOM_USERNAME'),
      operation = "ChargeOnly", // Default to charge only
      amount,
      returnValue,
      webHookUrl,
      productName,
      language = "he", // Default to Hebrew
      isoCoinId = 1, // Default to ILS
      uiDefinition,
      planId,
      userDetails, // New parameter containing user details
    } = body;

    // Validate required parameters
    if (!terminalNumber || !apiName) {
      throw new Error('Missing CardCom configuration. Please set CARDCOM_TERMINAL and CARDCOM_USERNAME environment variables.');
    }

    if (!amount) {
      throw new Error('Missing required parameter: amount');
    }

    // Create a redirect URL on our domain that can communicate with the parent window
    const redirectUrl = `${origin}/payment-redirect.html`;
    
    // Log the configuration
    console.log(`Creating CardCom payment session with terminal: ${terminalNumber}, operation: ${operation}`);

    // Extract user details for pre-filling the form
    const cardOwnerName = userDetails?.fullName || '';
    const cardOwnerEmail = userDetails?.email || '';
    const cardOwnerPhone = userDetails?.phone || '';
    const cardOwnerIdValue = userDetails?.idNumber || '';

    // Create UI definition with pre-filled user details
    const enhancedUiDefinition = {
      CardOwnerNameValue: cardOwnerName,
      CardOwnerEmailValue: cardOwnerEmail,
      CardOwnerPhoneValue: cardOwnerPhone,
      CardOwnerIdValue: cardOwnerIdValue,
      IsHideCardOwnerName: cardOwnerName ? true : false,
      IsHideCardOwnerEmail: cardOwnerEmail ? true : false,
      IsHideCardOwnerPhone: cardOwnerPhone ? true : false,
      IsHideCardOwnerIdentityNumber: cardOwnerIdValue ? true : false,
      ...(uiDefinition || {})
    };

    // Prepare the request payload for LowProfile Create
    const payload = {
      TerminalNumber: parseInt(terminalNumber),
      ApiName: apiName,
      Operation: operation,
      ReturnValue: returnValue || '',
      Amount: amount,
      // All redirects go through our internal redirect page
      SuccessRedirectUrl: `${redirectUrl}?success=true&plan=${planId || ''}`,
      FailedRedirectUrl: `${redirectUrl}?error=true&plan=${planId || ''}`,
      WebHookUrl: webHookUrl || null,
      ProductName: productName || 'Product Purchase',
      Language: language,
      ISOCoinId: isoCoinId,
      UIDefinition: enhancedUiDefinition
    };

    // Make the API request
    const response = await fetch('https://secure.cardcom.solutions/api/v11/LowProfile/Create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Process response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CardCom API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    if (result.ResponseCode !== 0) {
      throw new Error(`CardCom error: ${result.Description || 'Unknown error'}`);
    }

    console.log(`Created CardCom payment session: ${result.LowProfileId}`);

    // Return the payment URL and ID
    return new Response(
      JSON.stringify({
        success: true,
        lowProfileId: result.LowProfileId,
        url: result.Url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating CardCom payment session:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while processing the payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
