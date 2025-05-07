
import { serve } from "std/http/server.ts";
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

    // Get session data from request body
    const { 
      sessionId, 
      userId, 
      email, 
      planId, 
      paymentDetails,
      expiresAt
    } = await req.json();

    if (!sessionId || !planId || !expiresAt) {
      throw new Error('Session ID, plan ID, and expiry date are required');
    }

    // Check if payment_sessions table exists and create it if not
    await createPaymentSessionsTableIfNeeded(supabase);
    
    // Insert the session data
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        INSERT INTO public.payment_sessions (
          id, 
          user_id, 
          email, 
          plan_id, 
          payment_details, 
          expires_at
        ) VALUES (
          '${sessionId}',
          ${userId ? `'${userId}'` : 'null'},
          ${email ? `'${email}'` : 'null'},
          '${planId}',
          '${JSON.stringify(paymentDetails || {})}'::jsonb,
          '${expiresAt}'
        )
        ON CONFLICT (id) DO UPDATE
        SET 
          user_id = ${userId ? `'${userId}'` : 'null'},
          email = ${email ? `'${email}'` : 'null'},
          plan_id = '${planId}',
          payment_details = '${JSON.stringify(paymentDetails || {})}'::jsonb,
          expires_at = '${expiresAt}'
        RETURNING id
      `
    });

    if (error) {
      throw new Error(`Error saving session: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, sessionId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in save-session function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Create payment_sessions table if it doesn't exist
async function createPaymentSessionsTableIfNeeded(supabase: any) {
  try {
    // Check if the table exists
    const { data, error } = await supabase.rpc('check_row_exists', {
      p_table_name: 'information_schema.tables',
      p_column_name: 'table_name',
      p_value: 'payment_sessions'
    });

    // If the table doesn't exist, create it
    if (!data) {
      await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS public.payment_sessions (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id),
            email TEXT,
            plan_id TEXT NOT NULL,
            payment_details JSONB,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );

          -- Add RLS policies
          ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

          -- Allow users to access their own payment sessions
          CREATE POLICY "Users can access their own payment sessions"
            ON public.payment_sessions
            FOR ALL
            USING (
              auth.uid() = user_id OR 
              auth.uid() = '00000000-0000-0000-0000-000000000000'
            );
        `
      });
    }
  } catch (error) {
    console.error('Error ensuring payment_sessions table exists:', error);
  }
}
