
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

    // Get request body
    const { email, errorInfo, sessionId, recoveryUrl } = await req.json();

    // Ensure payment_sessions table exists
    await createPaymentSessionsTableIfNeeded(supabase);
    
    // Store recovery attempt
    await supabase.from('payment_recovery_logs').insert({
      email,
      session_id: sessionId,
      error_info: errorInfo,
      recovery_url: recoveryUrl
    });

    // Send recovery email - this is just a placeholder
    // In a real implementation, you would call an email service here
    console.log(`Recovery email would be sent to ${email} with recovery URL: ${recoveryUrl}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in recover-payment-session function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
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

          -- Create payment_recovery_logs table
          CREATE TABLE IF NOT EXISTS public.payment_recovery_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT NOT NULL,
            session_id UUID,
            error_info JSONB,
            recovery_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );

          -- Add RLS policies
          ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.payment_recovery_logs ENABLE ROW LEVEL SECURITY;

          -- Allow users to access their own payment sessions
          CREATE POLICY "Users can access their own payment sessions"
            ON public.payment_sessions
            FOR ALL
            USING (
              auth.uid() = user_id OR 
              auth.uid() = '00000000-0000-0000-0000-000000000000'
            );

          -- Allow anyone to insert payment recovery logs (no auth required)
          CREATE POLICY "Anyone can insert recovery logs"
            ON public.payment_recovery_logs
            FOR INSERT
            WITH CHECK (true);
            
          -- Only admins can read recovery logs
          CREATE POLICY "Only admins can read recovery logs"
            ON public.payment_recovery_logs
            FOR SELECT
            USING (
              auth.uid() = '00000000-0000-0000-0000-000000000000'
            );
        `
      });
    }
  } catch (error) {
    console.error('Error ensuring payment_sessions table exists:', error);
  }
}
