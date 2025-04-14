
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    console.log("Payment initialization request received");

    // Parse request body
    const requestData = await req.json();
    const { planId, amount, userId, userName, email } = requestData;

    console.log('Payment initialization data:', { planId, amount, email });

    // Validate required parameters
    if (!amount || !email) {
      throw new Error('Missing required parameters (amount or email)');
    }

    // Get Cardcom credentials - log access for debugging
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");

    console.log('Cardcom credentials check:', {
      hasTerminal: !!terminalNumber,
      hasApiName: !!apiName
    });

    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }

    // Determine app URL for redirects/webhooks
    const appUrl = (() => {
      try {
        const url = new URL(req.url);
        return url.origin;
      } catch (error) {
        console.warn("Couldn't parse request URL, using default:", error);
        return 'https://ndhakvhrrkczgylcmyoc.supabase.co';
      }
    })();

    // Generate a unique ID for the transaction
    const transactionId = crypto.randomUUID();

    // Create payment session in Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Save session before making the Cardcom request
    const { error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .insert({
        id: transactionId,
        user_id: userId || null,
        email: email,
        plan_id: planId,
        payment_details: {
          amount,
          planId,
          status: 'initiated',
          created_at: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 30 * 60000).toISOString() // 30 minutes
      });

    if (sessionError) {
      console.error('Error creating payment session:', sessionError);
      throw new Error('Failed to create payment session');
    }

    // Prepare Cardcom API request
    const formData = new FormData();
    
    // Required parameters
    formData.append('TerminalNumber', terminalNumber);
    formData.append('ApiName', apiName);
    formData.append('Operation', '1'); // Charge only
    formData.append('SumToBill', amount.toString());
    formData.append('CoinID', '1'); // ILS
    formData.append('Language', 'he');
    formData.append('APILevel', '10');
    formData.append('Codepage', '65001');
    formData.append('ReturnValue', transactionId);

    // User details
    if (userName) {
      formData.append('CardOwnerName', userName);
    }
    if (email) {
      formData.append('CardOwnerEmail', email);
      formData.append('ReqCardOwnerEmail', 'true');
      formData.append('ShowCardOwnerEmail', 'true');
    }

    // URLs
    const webhookUrl = `${appUrl}/functions/v1/cardcom-webhook`;
    const successUrl = `${appUrl}/subscription/success?lowProfileId=${transactionId}&planId=${planId}`;
    const errorUrl = `${appUrl}/subscription/error?error=true&planId=${planId}`;

    formData.append('SuccessRedirectUrl', successUrl);
    formData.append('FailedRedirectUrl', errorUrl);
    formData.append('IndicatorUrl', webhookUrl);

    console.log('Making Cardcom API request with parameters:', {
      terminalNumber,
      apiName,
      amount,
      webhookUrl,
      successUrl,
      errorUrl
    });

    // Call Cardcom API
    const cardcomResponse = await fetch(
      'https://secure.cardcom.solutions/Interface/LowProfile.aspx',
      {
        method: 'POST',
        body: formData
      }
    );

    // Get raw response for debugging
    const responseStatus = cardcomResponse.status;
    const responseText = await cardcomResponse.text();
    
    console.log('Cardcom API response:', {
      status: responseStatus,
      text: responseText
    });

    // Parse response (handle both JSON and URL-encoded formats)
    let cardcomData;
    try {
      cardcomData = JSON.parse(responseText);
    } catch (jsonError) {
      console.log('Response not JSON, parsing as URL params');
      const params = new URLSearchParams(responseText);
      cardcomData = {
        ResponseCode: Number(params.get('ResponseCode')),
        Description: params.get('Description'),
        LowProfileCode: params.get('LowProfileCode'),
        Url: params.get('url') || params.get('Url')
      };
    }

    // Validate Cardcom response
    if (!cardcomData || cardcomData.ResponseCode !== 0) {
      throw new Error(`Cardcom error: ${cardcomData?.Description || 'Unknown error'}`);
    }

    const paymentUrl = cardcomData.Url || cardcomData.url;
    if (!paymentUrl) {
      throw new Error('No payment URL received from Cardcom');
    }

    // Update session with Cardcom response data
    await supabaseClient
      .from('payment_sessions')
      .update({
        payment_details: {
          ...cardcomData,
          status: 'created',
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', transactionId);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        url: paymentUrl,
        lowProfileId: transactionId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Payment initialization error:', error);
    
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
