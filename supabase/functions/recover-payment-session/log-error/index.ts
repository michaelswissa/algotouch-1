
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get error data from request body
    const { 
      userId, 
      errorCode, 
      errorMessage, 
      errorDetails, 
      context, 
      paymentDetails 
    } = await req.json();

    if (!userId || !errorCode) {
      throw new Error('Missing required error information');
    }

    // Insert error into payment_errors table
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        INSERT INTO public.payment_errors (
          user_id, error_code, error_message, error_details, context, payment_details
        ) VALUES (
          '${userId}', 
          '${errorCode}', 
          '${errorMessage || ""}', 
          '${JSON.stringify(errorDetails || {})}', 
          '${context || ""}', 
          '${JSON.stringify(paymentDetails || {})}'
        )
      `
    });

    if (error) {
      throw new Error(`Error logging payment error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in log-error function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
