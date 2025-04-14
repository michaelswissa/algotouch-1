
import { serve } from "std/http/server.ts";
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

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Create payment session with Cardcom
    if (path === 'create-payment') {
      const { 
        planId, 
        userId, 
        fullName, 
        email, 
        operationType, 
        successRedirectUrl, 
        errorRedirectUrl 
      } = await req.json();
      
      console.log('Creating payment session for:', { planId, userId, email });
      
      // Get Cardcom credentials from environment variables
      const terminalNumber = Deno.env.get('CARDCOM_TERMINAL_NUMBER');
      const apiName = Deno.env.get('CARDCOM_API_NAME');
      
      if (!terminalNumber || !apiName) {
        throw new Error('Missing Cardcom API credentials in environment variables');
      }

      // Create a payment URL using Cardcom LowProfile API
      const cardcomUrl = 'https://secure.cardcom.solutions/Interface/LowProfile.aspx';
      
      // Set default values based on planId if not provided
      const planDetails = {
        monthly: { price: 371, trial: true },
        annual: { price: 3371, trial: false },
        vip: { price: 13121, trial: false }
      };
      
      const amount = planDetails[planId]?.price || 371;
      
      // Build params to send to Cardcom
      const params = new URLSearchParams({
        'terminalnumber': terminalNumber,
        'username': apiName,
        'codepage': '65001',
        'APILevel': '10',
        'Operation': operationType?.toString() || '1', // Default: ChargeOnly
        'Language': 'he',
        'ReturnValue': planId || '',
        'CoinID': '1', // ILS
        'SumToBill': amount.toString(),
        'ProductName': `מנוי ${planId === 'annual' ? 'שנתי' : planId === 'vip' ? 'VIP' : 'חודשי'}`,
        'SuccessRedirectUrl': successRedirectUrl || `${url.origin}/subscription?step=4&success=true&planId=${planId}`,
        'ErrorRedirectUrl': errorRedirectUrl || `${url.origin}/subscription?step=3&error=true&planId=${planId}`,
        'AutoRedirect': 'true'
      });
      
      // Add webhook URL if provided
      const webhookUrl = `${url.origin}/functions/v1/cardcom-webhook`;
      params.append('IndicatorUrl', webhookUrl);
      
      // Add customer info if available
      if (fullName) {
        params.append('CardOwnerName', fullName);
      }
      
      if (email) {
        params.append('CardOwnerEmail', email);
        params.append('ShowCardOwnerEmail', 'true');
      }
      
      // Call Cardcom API to create payment session
      const response = await fetch(cardcomUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cardcom API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Parse Cardcom response
      const responseData = await response.json();
      console.log('Cardcom API response:', responseData);
      
      if (responseData.ResponseCode !== 0) {
        throw new Error(`Cardcom error: ${responseData.Description}`);
      }
      
      // Store payment session in database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 2); // Session valid for 2 hours
      
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('payment_sessions')
        .insert({
          id: responseData.LowProfileCode,
          user_id: userId || null,
          email: email || null,
          plan_id: planId,
          payment_details: {
            lowProfileId: responseData.LowProfileCode,
            planId: planId,
            isRegistrationFlow: userId ? false : true,
            createdAt: new Date().toISOString()
          },
          expires_at: expiresAt.toISOString()
        })
        .select('*')
        .single();
        
      if (sessionError) {
        console.error('Error creating payment session:', sessionError);
        // Continue anyway, this is not critical
      }
      
      // Store information in localStorage for status checking
      const clientScript = `
        localStorage.setItem('payment_pending_id', '${responseData.LowProfileCode}');
        localStorage.setItem('payment_pending_plan', '${planId}');
        localStorage.setItem('payment_session_created', '${new Date().toISOString()}');
      `;
      
      // Return payment URL and session data
      return new Response(
        JSON.stringify({
          success: true,
          url: responseData.Url,
          lowProfileId: responseData.LowProfileCode,
          clientScript: clientScript
        }),
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
