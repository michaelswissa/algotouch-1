
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
    // Create the SQL functions
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
        
        -- Function to increment a column in any table by ID
        CREATE OR REPLACE FUNCTION public.increment_column_value(
          p_row_id UUID,
          p_table_name TEXT,
          p_column_name TEXT,
          p_increment_by INT DEFAULT 1
        )
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          query TEXT;
        BEGIN
          -- Validate input to avoid SQL injection
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = p_table_name AND table_schema = 'public'
          ) THEN
            RAISE EXCEPTION 'Invalid table name: %', p_table_name;
            RETURN FALSE;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = p_table_name AND column_name = p_column_name AND table_schema = 'public'
          ) THEN
            RAISE EXCEPTION 'Invalid column name: %', p_column_name;
            RETURN FALSE;
          END IF;
          
          -- Build and execute the update query
          query := format(
            'UPDATE public.%I SET %I = %I + $1 WHERE id = $2',
            p_table_name, p_column_name, p_column_name
          );
          
          EXECUTE query USING p_increment_by, p_row_id;
          
          RETURN TRUE;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Error in increment_column_value: %', SQLERRM;
            RETURN FALSE;
        END;
        $$;

        -- Function to check if a row exists in any table
        CREATE OR REPLACE FUNCTION public.check_row_exists(
          p_table_name TEXT,
          p_column_name TEXT,
          p_value TEXT
        )
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          query TEXT;
          row_exists BOOLEAN;
        BEGIN
          -- Validate input to avoid SQL injection
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = p_table_name AND table_schema = 'public'
          ) THEN
            RAISE EXCEPTION 'Invalid table name: %', p_table_name;
            RETURN FALSE;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = p_table_name AND column_name = p_column_name AND table_schema = 'public'
          ) THEN
            RAISE EXCEPTION 'Invalid column name: %', p_column_name;
            RETURN FALSE;
          END IF;
          
          -- Build and execute the select query
          query := format(
            'SELECT EXISTS(SELECT 1 FROM public.%I WHERE %I = $1)',
            p_table_name, p_column_name
          );
          
          EXECUTE query INTO row_exists USING p_value;
          
          RETURN row_exists;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Error in check_row_exists: %', SQLERRM;
            RETURN FALSE;
        END;
        $$;
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
        message: "Database functions created successfully" 
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
