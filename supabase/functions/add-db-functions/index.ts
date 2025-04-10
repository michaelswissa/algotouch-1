
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Create the SQL function
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: `
        -- Function to increment user points in one database query
        CREATE OR REPLACE FUNCTION public.increment_user_points(
          user_id_param UUID,
          points_to_add INTEGER
        ) RETURNS SETOF community_reputation AS $$
        DECLARE
          _result community_reputation;
        BEGIN
          -- Check if user exists and update, or insert if they don't
          INSERT INTO community_reputation (user_id, points)
          VALUES (user_id_param, points_to_add)
          ON CONFLICT (user_id) 
          DO UPDATE SET
            points = community_reputation.points + points_to_add,
            updated_at = now()
          RETURNING * INTO _result;
          
          RETURN NEXT _result;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (error) {
      console.error('Error creating function:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Database function 'increment_user_points' created successfully" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
