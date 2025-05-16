
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Setup the pg_cron extension if not already available
    await supabaseClient.rpc('setup_webhook_cron');

    // Create a cron job to run every hour
    const { data: cronData, error: cronError } = await supabaseClient.rpc('create_webhook_processor_cron');

    if (cronError) {
      throw new Error(`Failed to create cron job: ${cronError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron job setup successfully',
        data: cronData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error setting up cron job:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Error setting up cron job',
        error: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
