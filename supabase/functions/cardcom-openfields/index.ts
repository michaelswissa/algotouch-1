
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

function generateRandomId() {
  return crypto.randomUUID();
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { planId, planName, amount, userId, userName, userEmail, isRecurring, freeTrialDays } = await req.json();
    
    console.log('Creating payment session for:', { planId, userId, userEmail });
    
    // Get Cardcom credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials in environment variables');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate expiration time (30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // Generate a unique session ID
    const sessionId = generateRandomId();
    
    // Create a unique low profile ID
    const lowProfileId = generateRandomId();

    // Determine operation based on plan
    let operation = "1"; // Default: ChargeOnly
    if (isRecurring) {
      operation = freeTrialDays > 0 ? "3" : "2"; // CreateTokenOnly or ChargeAndCreateToken
    }

    // Save payment session to database
    const { error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        email: userEmail,
        plan_id: planId,
        expires_at: expiresAt.toISOString(),
        payment_details: {
          lowProfileId,
          amount,
          planName,
          userName,
          userEmail,
          operation,
          status: 'created',
          created_at: new Date().toISOString()
        }
      });

    if (sessionError) {
      console.error('Error creating payment session:', sessionError);
      throw new Error(`Failed to create payment session: ${sessionError.message}`);
    }

    // Create webhook URL with origin or fallback
    const origin = req.headers.get('origin') || 'https://ndhakvhrrkczgylcmyoc.supabase.co';
    const webhookUrl = `${origin}/functions/v1/cardcom-webhook`;

    console.log('Payment session created successfully', { lowProfileId, sessionId });
    
    return new Response(
      JSON.stringify({
        success: true,
        lowProfileId,
        sessionId,
        webhookUrl,
        message: 'Payment session created successfully'
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
