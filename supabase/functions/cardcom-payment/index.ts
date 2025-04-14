
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
  try {
    console.log("Payment request received");
    
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

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
    if (!planId || !amount || !email) {
      console.error("Missing required payment parameters:", { planId, amount, email });
      throw new Error('Missing required payment parameters');
    }
    
    console.log('Initializing payment for:', { planId, amount, email });
    
    // Get the Cardcom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    
    if (!terminalNumber || !apiName) {
      console.error("Missing Cardcom API credentials");
      throw new Error('Missing Cardcom API credentials');
    }

    // Determine app URL for redirects and webhooks
    // Use actual hostname from the request if possible
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
    formData.append('TerminalNumber', terminalNumber);
    formData.append('ApiName', apiName);
    formData.append('SumToBill', amount.toString());
    formData.append('CoinID', '1'); // ILS
    formData.append('Language', 'he');
    formData.append('Operation', isRecurring ? '2' : '1'); // Charge and create token or charge only
    formData.append('SuccessRedirectUrl', `${appUrl}/subscription/success`);
    formData.append('FailedRedirectUrl', `${appUrl}/subscription/error`);
    formData.append('WebHookUrl', `${appUrl}/functions/v1/cardcom-webhook`);
    formData.append('ReturnValue', returnValue || `${userId || 'guest'}_${planId}_${Date.now()}`);
    formData.append('ProductName', `${planId} Subscription`);
    formData.append('APILevel', '10');
    
    // Set default payment option
    if (planId === 'monthly' || planId === 'annual') {
      formData.append('DefaultNumOfPayments', planId === 'monthly' ? '1' : '12');
    }

    // Append optional user details if available
    if (userName) {
      formData.append('CardOwnerName', userName);
    }
    if (email) {
      formData.append('CardOwnerEmail', email);
    }
    
    // Call Cardcom API to create payment session
    console.log("Sending request to Cardcom API");
    const cardcomResponse = await fetch(
      'https://secure.cardcom.solutions/Interface/LowProfile.aspx', 
      { 
        method: 'POST', 
        body: formData
      }
    );
    
    // Get raw response text for debugging
    const responseText = await cardcomResponse.text();
    console.log("Cardcom raw response:", responseText);
    
    // Parse JSON response (with error handling)
    let cardcomData;
    try {
      cardcomData = JSON.parse(responseText);
    } catch (error) {
      console.error("Error parsing Cardcom response:", error);
      console.error("Raw response was:", responseText);
      
      // Check if response contains error text
      if (responseText.includes("ResponseCode") && responseText.includes("Description")) {
        // This might be a URL-encoded string response
        try {
          const params = new URLSearchParams(responseText);
          const responseCode = params.get("ResponseCode");
          const description = params.get("Description");
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Cardcom error: ${description || 'Unknown error'}`,
              responseCode,
              responseText
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        } catch (parseError) {
          console.error("Error parsing URL params:", parseError);
        }
      }
      
      throw new Error(`Failed to parse Cardcom response: ${responseText}`);
    }
    
    // Check if Cardcom returned an error
    if (cardcomData.ResponseCode !== 0) {
      console.error("Cardcom API error:", cardcomData);
      throw new Error(`Cardcom error: ${cardcomData.Description || 'Unknown error'}`);
    }
    
    console.log('Payment session created:', {
      lowProfileId: cardcomData.LowProfileCode,
      url: cardcomData.Url || cardcomData.url
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
        id: cardcomData.LowProfileCode,
        user_id: userId || null,
        email: email,
        plan_id: planId,
        payment_details: cardcomData,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
      });
    
    if (sessionError) {
      console.error('Error creating payment session:', sessionError);
    }
    
    // Also log to payment_logs table for tracking
    await supabaseClient
      .from('payment_logs')
      .insert({
        lowprofile_id: cardcomData.LowProfileCode,
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
        url: cardcomData.Url || cardcomData.url,
        lowProfileId: cardcomData.LowProfileCode 
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
