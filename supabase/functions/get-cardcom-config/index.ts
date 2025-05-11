
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Get CardCom credentials from environment variables
    const terminalNumber = Deno.env.get('CARDCOM_TERMINAL');
    const apiName = Deno.env.get('CARDCOM_USERNAME');
    const apiPassword = Deno.env.get('CARDCOM_API_PASSWORD');
    
    // Return public configuration (never return API password to client)
    return new Response(
      JSON.stringify({
        terminalNumber,
        apiName,
        hasApiPassword: !!apiPassword
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error getting CardCom configuration:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'An error occurred while fetching CardCom configuration'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
