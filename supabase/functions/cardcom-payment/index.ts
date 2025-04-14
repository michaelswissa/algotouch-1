
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

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
    console.log('Processing payment request');
    const requestData = await req.json();
    
    const { 
      planId, 
      amount, 
      userId, 
      userName, 
      email, 
      returnValue,
      isRecurring = false
    } = requestData;
    
    // Validate required parameters
    if (!amount || !email) {
      throw new Error('Missing required parameters: amount and email are required');
    }
    
    console.log('Payment request data:', {
      planId,
      amount,
      userId,
      email,
      returnValue,
      isRecurring
    });

    // Get the Cardcom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    // Create the Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Determine operation type based on plan
    let operation = "1"; // Default: Charge only
    
    if (isRecurring) {
      operation = "2"; // Charge and create token
    }
    
    // Store payment session
    if (userId) {
      try {
        // Set expiration time (2 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 2);
        
        // Create payment session record
        await supabaseClient
          .from('payment_sessions')
          .insert({
            id: crypto.randomUUID(),
            user_id: userId,
            email: email,
            plan_id: planId,
            payment_details: {
              amount,
              planId,
              isRecurring,
              returnValue
            },
            expires_at: expiresAt.toISOString()
          });
      } catch (error) {
        console.error('Error creating payment session:', error);
        // Continue execution even if session creation fails
      }
    }
    
    // Create the request URL for Cardcom LowProfile
    const cardcomBaseUrl = 'https://secure.cardcom.solutions/Interface/LowProfile.aspx';
    
    // Prepare query parameters
    const params = new URLSearchParams();
    params.append('TerminalNumber', terminalNumber);
    params.append('UserName', apiName);
    params.append('APILevel', '10');
    params.append('SumToBill', amount.toString());
    params.append('CoinID', '1'); // 1 = ILS
    params.append('Language', 'he');
    params.append('Codepage', '65001');
    params.append('ShowInvoiceHead', 'true');
    params.append('ReturnValue', returnValue);
    params.append('Operation', operation);
    
    // Set success and error redirect URLs
    const baseUrl = req.headers.get('origin') || 'https://algutrader.com';
    const successRedirectUrl = `${baseUrl}/subscription?success=true&planId=${planId}`;
    const errorRedirectUrl = `${baseUrl}/subscription?error=true&planId=${planId}`;
    const indicatorUrl = `${baseUrl}/api/payment-callback`; // This should handle server-side payment notifications
    
    params.append('SuccessRedirectUrl', successRedirectUrl);
    params.append('ErrorRedirectUrl', errorRedirectUrl);
    params.append('IndicatorUrl', Deno.env.get('WEBHOOK_URL') || 'https://ndhakvhrrkczgylcmyoc.supabase.co/functions/v1/cardcom-webhook');
    
    // If we have a user name, add it
    if (userName) {
      params.append('CardOwnerName', userName);
    }
    
    // Add customer email
    params.append('CardOwnerEmail', email);
    params.append('ShowCardOwnerEmail', 'true');
    params.append('ReqCardOwnerEmail', 'true');
    
    // Make the request to Cardcom
    const cardcomResponse = await fetch(`${cardcomBaseUrl}?${params.toString()}`, {
      method: 'GET',
    });
    
    if (!cardcomResponse.ok) {
      const errorText = await cardcomResponse.text();
      throw new Error(`Cardcom API error: ${cardcomResponse.status} ${cardcomResponse.statusText} - ${errorText}`);
    }
    
    const cardcomData = await cardcomResponse.json();
    
    if (cardcomData.ResponseCode !== 0) {
      throw new Error(`Cardcom error: ${cardcomData.Description}`);
    }
    
    // We successfully created a LowProfile page
    const lowProfileResponse = {
      success: true,
      url: cardcomData.Url,
      lowProfileId: cardcomData.LowProfileId,
      planId: planId
    };
    
    console.log('Successfully created LowProfile page:', lowProfileResponse);
    
    return new Response(
      JSON.stringify(lowProfileResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing payment request:', error);
    
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
