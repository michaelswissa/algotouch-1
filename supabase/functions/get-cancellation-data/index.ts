
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Get the authenticated user
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      throw new Error('Authentication error: ' + userError.message);
    }
    
    // Parse request body
    const { subscriptionId } = await req.json();
    
    if (!subscriptionId) {
      throw new Error('Missing required parameter: subscriptionId');
    }
    
    // First, check if the subscription_cancellations table exists
    const { data: tableExists, error: checkError } = await supabaseClient.rpc('check_row_exists', {
      p_table_name: 'information_schema.tables',
      p_column_name: 'table_name',
      p_value: 'subscription_cancellations'
    });
    
    if (checkError) {
      console.error('Error checking if table exists:', checkError);
    }
    
    // If the table doesn't exist yet, return an empty array
    if (!tableExists) {
      return new Response(
        JSON.stringify([]),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Get cancellation data
    const { data, error } = await supabaseClient
      .from('subscription_cancellations')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('cancelled_at', { ascending: false });
      
    if (error) {
      throw new Error('Error fetching cancellation data: ' + error.message);
    }
    
    return new Response(
      JSON.stringify(data || []),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-cancellation-data function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
