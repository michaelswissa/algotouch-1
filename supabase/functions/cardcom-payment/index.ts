
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

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

// Helper function to validate URLs
function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const requestBody = await req.json();
    
    // Extract required parameters
    const { 
      planId, 
      userId, 
      email,
      fullName,
      operationType = 1, // Default to ChargeOnly
      successRedirectUrl,
      errorRedirectUrl 
    } = requestBody;
    
    // Validate required parameters
    if (!planId) {
      throw new Error('Missing required parameter: planId');
    }
    
    if (!successRedirectUrl || !isValidUrl(successRedirectUrl)) {
      throw new Error('Invalid or missing successRedirectUrl');
    }
    
    if (!errorRedirectUrl || !isValidUrl(errorRedirectUrl)) {
      throw new Error('Invalid or missing errorRedirectUrl');
    }
    
    console.log(`Creating payment session for planId: ${planId}, userId: ${userId || 'not provided'}`);
    
    // Determine amount based on plan
    let amount: number;
    switch (planId) {
      case 'monthly':
        amount = 199;
        break;
      case 'annual':
        amount = 1990;
        break;
      case 'vip':
        amount = 9990;
        break;
      default:
        amount = 199;
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Get Cardcom credentials from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "";
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "";
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    // Prepare webhook URL for Cardcom callback
    const webhookUrl = `${supabaseUrl}/functions/v1/cardcom-webhook`;
    
    // Prepare request to Cardcom API
    const cardcomUrl = "https://secure.cardcom.solutions/Interface/LowProfile.aspx";
    const cardcomParams = new URLSearchParams({
      TerminalNumber: terminalNumber,
      UserName: apiName,
      APILevel: '10',
      Operation: operationType.toString(),
      SumToBill: amount.toString(),
      CoinID: '1', // ILS
      Language: 'he',
      ReturnValue: uuidv4(), // Unique identifier for this transaction
      SuccessRedirectUrl: successRedirectUrl,
      ErrorRedirectUrl: errorRedirectUrl,
      IndicatorUrl: webhookUrl,
      codepage: '65001'
    });
    
    // Add optional parameters
    if (fullName) {
      cardcomParams.append('CardOwnerName', fullName);
    }
    
    // Create payment session in Supabase
    const paymentSessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    
    // Create payment session record
    await supabaseClient
      .from('payment_sessions')
      .insert({
        id: paymentSessionId,
        user_id: userId || null,
        email: email || null,
        plan_id: planId,
        expires_at: expiresAt.toISOString(),
        payment_details: {
          amount,
          currency: 'ILS',
          created_at: now.toISOString(),
          isRegistrationFlow: !!email && !userId,
          planId
        }
      });
    
    // Call Cardcom API to create low profile page
    console.log('Calling Cardcom API to create payment page...');
    const response = await fetch(cardcomUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: cardcomParams.toString()
    });
    
    if (!response.ok) {
      throw new Error(`Cardcom API returned error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('Cardcom API response:', responseData);
    
    if (responseData.ResponseCode !== 0) {
      throw new Error(`Cardcom Error: ${responseData.Description || 'Unknown error'}`);
    }
    
    const lowProfileId = responseData.LowProfileCode;
    const paymentUrl = responseData.url;
    
    // Update payment session with low profile ID
    await supabaseClient
      .from('payment_sessions')
      .update({
        payment_details: {
          ...JSON.parse(JSON.stringify(requestBody)),
          amount,
          currency: 'ILS',
          created_at: now.toISOString(),
          isRegistrationFlow: !!email && !userId,
          planId,
          lowProfileId,
          paymentSessionId
        }
      })
      .eq('id', paymentSessionId);
    
    // Return the payment URL and low profile ID
    return new Response(
      JSON.stringify({
        success: true,
        url: paymentUrl,
        lowProfileId,
        sessionId: paymentSessionId
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
