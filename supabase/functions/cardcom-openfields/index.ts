
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

    console.log('Creating OpenFields payment session for plan:', planId);

    // Get the Cardcom API credentials from environment variables
    const terminalNumber = "160138";  // Hard-coded from provided details
    const apiUsername = "bLaocQRMSnwphQRUVG3b";  // Hard-coded from provided details
    const apiPassword = "i9nr6caGbgheTdYfQbo6"; // For specific operations

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

    // Set up webhook URL for payment notifications
    const webhookUrl = new URL(req.url).origin + "/functions/cardcom-webhook";
    
    // Create response with required data for OpenFields integration
    return new Response(
      JSON.stringify({
        success: true,
        terminalNumber,
        apiUsername,
        apiPassword,
        planId,
        planName,
        amount,
        userEmail,
        userName,
        webhookUrl
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
