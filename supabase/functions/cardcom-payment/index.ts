
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log("Payment request received");
    
    const requestData = await req.json();
    const { 
      planId, 
      amount, 
      userId, 
      userName, 
      email, 
      returnValue,
      isRecurring 
    } = requestData;
    
    // Validate required parameters
    if (!amount || !email) {
      console.error("Missing required payment parameters:", { planId, amount, email });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required payment parameters (amount or email)'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    console.log('Initializing payment for:', { planId, amount, email });
    
    // Get the Cardcom API credentials with verbose logging
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    
    console.log("Checking Cardcom credentials availability:");
    console.log(`CARDCOM_TERMINAL_NUMBER available: ${Boolean(terminalNumber)}`);
    console.log(`CARDCOM_API_NAME available: ${Boolean(apiName)}`);
    
    if (!terminalNumber || !apiName) {
      console.error("Missing Cardcom API credentials");
      return new Response(
        JSON.stringify({
          success: false, 
          error: 'Missing Cardcom API credentials. Please check your Supabase secrets configuration.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Determine app URL for redirects and webhooks
    const appUrl = (() => {
      try {
        const url = new URL(req.url);
        // Extract hostname from the request URL
        const protocol = url.protocol;
        const hostname = url.hostname;
        
        // If it's localhost, use a default
        if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
          return Deno.env.get('APP_URL') || 'https://ndhakvhrrkczgylcmyoc.supabase.co';
        }
        
        return `${protocol}//${hostname}`;
      } catch (error) {
        console.warn("Couldn't parse request URL, using default:", error);
        return Deno.env.get('APP_URL') || 'https://ndhakvhrrkczgylcmyoc.supabase.co';
      }
    })();
    
    console.log("Using app URL for redirects:", appUrl);
    
    // Prepare parameters for Cardcom Low Profile payment
    const formData = new FormData();
    
    // Required parameters according to documentation
    formData.append('TerminalNumber', terminalNumber);
    formData.append('ApiName', apiName);
    formData.append('Operation', isRecurring ? '2' : '1'); // 1=Charge only, 2=Charge+token
    formData.append('SumToBill', amount.toString());
    formData.append('CoinID', '1'); // ILS
    formData.append('Language', 'he');
    formData.append('APILevel', '10'); // Latest API version
    formData.append('Codepage', '65001'); // UTF-8
    
    // Redirect URLs - using HTTPS as required
    const successUrl = `${appUrl}/subscription/success?lowProfileId={LowProfileCode}&planId=${planId}`;
    const errorUrl = `${appUrl}/subscription/error?error=true&planId=${planId}`;
    const webhookUrl = `${appUrl}/functions/v1/cardcom-webhook`;
    
    formData.append('SuccessRedirectUrl', successUrl);
    formData.append('FailedRedirectUrl', errorUrl);
    formData.append('IndicatorUrl', webhookUrl);
    
    // User details
    if (userName) {
      formData.append('CardOwnerName', userName);
    }
    if (email) {
      formData.append('CardOwnerEmail', email);
      formData.append('ReqCardOwnerEmail', 'true'); // Make email a required field
      formData.append('ShowCardOwnerEmail', 'true'); // Show email field
    }
    
    // Product information
    const productName = planId === 'monthly' ? 'מנוי חודשי' : 
                         planId === 'annual' ? 'מנוי שנתי' : 
                         planId === 'vip' ? 'מנוי VIP' : 
                         'מנוי';
    formData.append('ProductName', productName);
    
    // ReturnValue - used to identify the transaction
    const transactionId = returnValue || `${userId || 'guest'}_${planId}_${Date.now()}`;
    formData.append('ReturnValue', transactionId);

    // Log the full request details for debugging
    console.log("Sending request to Cardcom API with parameters:");
    console.log(`TerminalNumber: ${terminalNumber}`);
    console.log(`ApiName: ${apiName}`);
    console.log(`Operation: ${isRecurring ? '2' : '1'}`);
    console.log(`SumToBill: ${amount}`);
    console.log(`ProductName: ${productName}`);
    console.log(`SuccessRedirectUrl: ${successUrl}`);
    console.log(`FailedRedirectUrl: ${errorUrl}`);
    console.log(`IndicatorUrl: ${webhookUrl}`);
    
    // Call Cardcom API to create payment session
    const cardcomResponse = await fetch(
      'https://secure.cardcom.solutions/Interface/LowProfile.aspx', 
      { 
        method: 'POST', 
        body: formData
      }
    );
    
    // Get raw response status and text
    const responseStatus = cardcomResponse.status;
    const responseText = await cardcomResponse.text();
    console.log(`Cardcom API responded with status ${responseStatus}`);
    console.log("Cardcom raw response:", responseText);
    
    if (responseStatus !== 200) {
      console.error(`Cardcom API error: Status ${responseStatus}, Response: ${responseText}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cardcom API returned status ${responseStatus}: ${responseText}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    // Parse the response which may be URL-encoded or JSON
    let cardcomData;
    try {
      // Try parsing as JSON first
      cardcomData = JSON.parse(responseText);
      console.log("Parsed response as JSON:", cardcomData);
    } catch (jsonError) {
      console.log("Response is not JSON, trying URL-encoded format");
      
      try {
        // Parse URL-encoded response
        const urlParams = new URLSearchParams(responseText);
        cardcomData = {
          ResponseCode: Number(urlParams.get("ResponseCode")),
          Description: urlParams.get("Description"),
          LowProfileCode: urlParams.get("LowProfileCode"),
          Url: urlParams.get("url") || urlParams.get("Url"),
          UrlToPayPal: urlParams.get("PayPalUrl"),
          UrlToBit: urlParams.get("BitUrl")
        };
        console.log("Parsed response as URL params:", cardcomData);
      } catch (urlError) {
        console.error("Error parsing URL params:", urlError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to parse Cardcom response: ${responseText}`,
            rawResponse: responseText
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }
    
    // Check if Cardcom returned an error
    if (cardcomData.ResponseCode !== 0) {
      console.error("Cardcom API error:", cardcomData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cardcom error: ${cardcomData.Description || 'Unknown error'}`,
          cardcomData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    // Extract the relevant data from the response
    const lowProfileId = cardcomData.LowProfileCode;
    const paymentUrl = cardcomData.Url || cardcomData.url;
    
    if (!lowProfileId || !paymentUrl) {
      console.error("Missing required data in Cardcom response:", cardcomData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required data in Cardcom response",
          cardcomData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    console.log('Payment session created successfully:', {
      lowProfileId,
      url: paymentUrl
    });
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Create a payment session record
    const { error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .insert({
        id: lowProfileId,
        user_id: userId || null,
        email: email,
        plan_id: planId,
        payment_details: cardcomData,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
      });
    
    if (sessionError) {
      console.error('Error creating payment session:', sessionError);
      // Continue without failing - the payment process can still work even if logging fails
    }
    
    // Also log to payment_logs table for tracking
    await supabaseClient
      .from('payment_logs')
      .insert({
        lowprofile_id: lowProfileId,
        user_id: userId || null,
        status: 'created',
        plan_id: planId,
        payment_data: {
          ...cardcomData,
          amount,
          email,
          userName,
          created_at: new Date().toISOString()
        }
      })
      .catch(error => console.error('Error logging payment:', error));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        url: paymentUrl,
        lowProfileId 
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
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        stackTrace: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
