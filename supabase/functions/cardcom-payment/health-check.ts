
// Health check endpoint for the cardcom-payment Edge Function
// This helps with diagnostics when payment issues occur

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Check environment variables
    const healthStatus = {
      timestamp: new Date().toISOString(),
      function: 'cardcom-payment/health-check',
      status: 'ok',
      environment: {
        CARDCOM_TERMINAL: !!Deno.env.get('CARDCOM_TERMINAL'),
        CARDCOM_USERNAME: !!Deno.env.get('CARDCOM_USERNAME'),
        CARDCOM_API_PASSWORD: !!Deno.env.get('CARDCOM_API_PASSWORD'),
        SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
        SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY')
      }
    };
    
    // Return the health status
    return new Response(
      JSON.stringify({ 
        success: true,
        healthStatus
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
