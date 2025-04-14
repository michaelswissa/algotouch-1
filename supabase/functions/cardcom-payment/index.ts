
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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
    const requestBody = await req.json();
    const { planId, amount, userEmail, userName, successUrl, errorUrl } = requestBody;
    
    if (!planId || !amount || !userEmail) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required parameters: planId, amount, and userEmail are required" 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    console.log(`Creating payment session for: ${userEmail}, plan: ${planId}, amount: ${amount}`);

    // Get Cardcom credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    
    if (!terminalNumber || !apiName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing Cardcom API credentials" 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    // Generate a unique low profile ID (using UUID v4)
    const lowProfileId = crypto.randomUUID();
    
    // Get the hostname for webhook URL
    let origin;
    try {
      const url = new URL(req.url);
      origin = `${url.protocol}//${url.hostname}`;
      if (url.port) {
        origin += `:${url.port}`;
      }
    } catch {
      // Fallback to Supabase hostname
      origin = Deno.env.get('SUPABASE_URL') || 'https://ndhakvhrrkczgylcmyoc.supabase.co';
    }

    // Create webhook URL
    const webhookUrl = `${origin}/functions/v1/cardcom-webhook`;
    
    // Set success and error URLs (with defaults)
    const success_url = successUrl || `${origin}/subscription?success=true&planId=${planId}&lowProfileId=${lowProfileId}`;
    const error_url = errorUrl || `${origin}/subscription?error=true`;

    // Construct the payment URL for Cardcom
    const paymentUrl = `https://secure.cardcom.solutions/External/LowProfile.aspx?` +
      `TerminalNumber=${terminalNumber}&` + 
      `UserName=${apiName}&` +
      `APILevel=10&` +
      `ReturnValue=${lowProfileId}&` +
      `SumToBill=${amount}&` +
      `ProductName=${encodeURIComponent(planId)}&` +
      `Language=he&` +
      `CoinID=1&` +
      `SuccessRedirectUrl=${encodeURIComponent(success_url)}&` +
      `ErrorRedirectUrl=${encodeURIComponent(error_url)}&` +
      `IndicatorUrl=${encodeURIComponent(webhookUrl)}`;

    console.log(`Payment URL generated: ${paymentUrl}`);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Save payment session in database
    await supabaseClient.from('payment_sessions').insert({
      id: crypto.randomUUID(),
      email: userEmail,
      plan_id: planId,
      payment_details: {
        lowProfileId,
        amount,
        planId,
        userEmail,
        userName: userName || '',
        status: 'created',
        created_at: new Date().toISOString()
      },
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    });
    
    console.log('Payment session created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        lowProfileId,
        url: paymentUrl,
        webhookUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating payment session:', error);
    
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
