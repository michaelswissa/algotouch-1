
import { serve } from "std/http/server.ts";
import { createClient } from '@supabase/supabase-js';

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
    const path = url.pathname.split('/').pop();

    // Get environment variables
    const TERMINAL_NUMBER = Deno.env.get('CARDCOM_TERMINAL_NUMBER');
    const API_NAME = Deno.env.get('CARDCOM_API_NAME');

    if (!TERMINAL_NUMBER || !API_NAME) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required Cardcom credentials'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

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

    // Create payment session with Cardcom using LowProfile
    if (path === 'create-payment') {
      const { planId, userId, fullName, email, successRedirectUrl, errorRedirectUrl } = await req.json();
      
      if (!planId || !email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required parameters (planId or email)' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      console.log('Creating payment session for:', { planId, userId, email });
      
      // Get plan amount based on planId
      let amount = 0;
      if (planId === 'monthly') {
        amount = 99;
      } else if (planId === 'annual') {
        amount = 899;
      } else if (planId === 'vip') {
        amount = 3499;
      }
      
      // Prepare request to Cardcom API for LowProfile
      const cardcomRequest = {
        TerminalNumber: TERMINAL_NUMBER,
        ApiName: API_NAME,
        ReturnValue: userId || email, // Store user ID or email to identify the payment
        Amount: amount,
        SuccessRedirectUrl: successRedirectUrl || `${url.origin}/subscription?step=4&success=true&plan=${planId}`,
        FailedRedirectUrl: errorRedirectUrl || `${url.origin}/subscription?step=3&error=true&plan=${planId}`,
        WebHookUrl: `${url.origin}/api/cardcom-webhook`, // Not implemented yet, but good to include
        ProductName: `${planId} subscription`,
        Language: 'he',
      };
      
      try {
        // Call Cardcom API to create LowProfile payment page
        const response = await fetch('https://secure.cardcom.solutions/Interface/LowProfile.aspx', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(cardcomRequest as any).toString(),
        });
        
        if (!response.ok) {
          throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
        }
        
        const responseText = await response.text();
        
        // Parse the response text as URL params
        const responseParams = new URLSearchParams(responseText);
        const responseCode = responseParams.get('ResponseCode');
        const lowProfileCode = responseParams.get('LowProfileCode');
        const url = responseParams.get('url');
        
        if (responseCode !== '0' || !url || !lowProfileCode) {
          throw new Error(`Cardcom API error: ${responseText}`);
        }
        
        // Log the created payment session
        console.log('Created Cardcom payment URL:', url);
        console.log('LowProfile code:', lowProfileCode);
        
        // Store payment session in Supabase
        if (userId) {
          const { error: storageError } = await supabaseClient
            .from('payment_logs')
            .insert({
              user_id: userId,
              lowprofile_id: lowProfileCode,
              plan_id: planId,
              status: 'pending',
              payment_data: {
                amount,
                email,
                planId,
              }
            });
            
          if (storageError) {
            console.error('Error storing payment session:', storageError);
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            url,
            lowProfileCode
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error) {
        console.error('Error calling Cardcom API:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
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
