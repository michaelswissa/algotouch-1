
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
      throw new Error('Missing required payment parameters');
    }
    
    console.log('Initializing payment for:', { planId, amount, email });
    
    // Get the Cardcom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    
    if (!terminalNumber || !apiName || !apiPassword) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    // Prepare parameters for Cardcom Low Profile payment
    const params = new URLSearchParams({
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      SumToBill: amount.toString(),
      CoinID: '1', // ILS
      Language: 'he',
      Operation: isRecurring ? '2' : '1', // Charge and create token or charge only
      SuccessRedirectUrl: `${Deno.env.get('APP_URL') || 'https://localhost:5173'}/subscription/success`,
      FailedRedirectUrl: `${Deno.env.get('APP_URL') || 'https://localhost:5173'}/subscription/error`,
      WebHookUrl: `${Deno.env.get('APP_URL') || 'https://localhost:5173'}/api/cardcom-webhook`,
      ReturnValue: returnValue || `${userId}_${planId}_${Date.now()}`,
      // Optional parameters
      ProductName: `${planId} Subscription`,
      APILevel: '10',
      DefaultNumOfPayments: planId === 'monthly' ? '1' : '12'
    });

    // Append optional user details if available
    if (userName) {
      params.append('CardOwnerName', userName);
    }
    if (email) {
      params.append('CardOwnerEmail', email);
    }
    
    // Call Cardcom API to create payment session
    const cardcomResponse = await fetch(
      'https://secure.cardcom.solutions/Interface/LowProfile.aspx', 
      { 
        method: 'POST', 
        body: params 
      }
    );
    
    if (!cardcomResponse.ok) {
      const errorText = await cardcomResponse.text();
      console.error('Cardcom API error:', errorText);
      throw new Error(`Cardcom API error: ${cardcomResponse.status} ${errorText}`);
    }
    
    const cardcomData = await cardcomResponse.json();
    
    console.log('Payment session created:', {
      lowProfileId: cardcomData.LowProfileCode,
      url: cardcomData.url
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
        user_id: userId,
        email: email,
        plan_id: planId,
        payment_details: cardcomData,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
      });
    
    if (sessionError) {
      console.error('Error creating payment session:', sessionError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        url: cardcomData.url,
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
