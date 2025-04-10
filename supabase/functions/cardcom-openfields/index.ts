
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
    const {
      planId,
      planName,
      amount,
      userEmail,
      userName,
      isRegistration,
      registrationData
    } = await req.json();

    // Validate required fields
    if (!planId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: planId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Creating payment session for plan:', planId);

    // Get the Cardcom API credentials from environment variables
    const terminalNumber = "160138";  // Hard-coded from your provided details
    const apiUsername = "bLaocQRMSnwphQRUVG3b";  // Hard-coded from your provided details
    const apiPassword = "i9nr6caGbgheTdYfQbo6"; // Only needed for specific operations

    // If this is a registration payment, store the registration data temporarily
    if (isRegistration && registrationData) {
      console.log('Processing registration data for new user');
      
      // Initialize Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      
      // Create an expiry date (30 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);
      
      // Store registration data in a temporary table
      const { error } = await supabaseClient
        .from('temp_registration_data')
        .insert({
          registration_data: registrationData,
          expires_at: expiresAt.toISOString(),
          used: false
        });
      
      if (error) {
        console.error('Error storing temporary registration data:', error);
      }
    }

    // Create Cardcom payment session (Low Profile)
    const webhookUrl = new URL(req.url).origin + "/functions/cardcom-webhook";
    const successUrl = new URL(req.url).origin + "/subscription?step=4&success=true";
    const failureUrl = new URL(req.url).origin + "/subscription?step=3&error=true";

    const productDescription = `מנוי ${planName || planId}`;

    // Create the URL search params for the request
    const params = new URLSearchParams({
      'TerminalNumber': terminalNumber,
      'UserName': apiUsername,
      'CodePage': '65001',
      'Operation': '1', // ChargeOnly
      'Language': 'he',
      'CoinID': '1', // ILS
      'SumToBill': amount.toString(),
      'ProductName': productDescription,
      'SuccessRedirectUrl': successUrl,
      'ErrorRedirectUrl': failureUrl,
      'IndicatorUrl': webhookUrl,
      'ReturnValue': planId,
      'APILevel': '10',
      'CardOwnerName': userName || '',
      'CardOwnerEmail': userEmail || '',
      'ShowCardOwnerEmail': userEmail ? 'true' : 'false',
      'IsVirtualTerminalMode': 'false',
      'HideCardOwnerName': Boolean(userName) ? 'false' : 'true',
      'MaxNumOfPayments': '1',
    });

    console.log('Sending request to Cardcom with params:', Object.fromEntries(params));

    // Create the Low Profile payment session
    const cardcomResponse = await fetch('https://secure.cardcom.solutions/Interface/LowProfile.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    // Get the full response text for debugging
    const responseText = await cardcomResponse.text();
    console.log('Cardcom raw response:', responseText);

    if (!cardcomResponse.ok) {
      console.error('Error from Cardcom API:', responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Error creating Cardcom payment session',
          details: responseText 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    // Parse the response - Cardcom returns a URL-encoded string
    const responseParams = new URLSearchParams(responseText);
    const responseCode = responseParams.get('ResponseCode');
    const description = responseParams.get('Description');
    const lowProfileId = responseParams.get('LowProfileCode');
    const url = responseParams.get('url');
    
    if (responseCode !== '0' || !lowProfileId) {
      console.error('Error in Cardcom response:', responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from Cardcom', 
          details: { responseCode, description, responseText } 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        lowProfileId,
        url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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
