
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

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
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError) {
      throw new Error('Authentication error: ' + authError.message);
    }

    const user = authData?.user;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Parse request body
    const { subscriptionId } = await req.json();

    // Create subscription_cancellations table if it doesn't exist
    await createCancellationTableIfNeeded(supabaseClient);
    
    // Fetch cancellation data
    const { data, error } = await supabaseClient
      .from('subscription_cancellations')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('cancelled_at', { ascending: false });

    if (error) {
      throw new Error('Error fetching cancellation data: ' + error.message);
    }

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in get-cancellation-data function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Create subscription_cancellations table if it doesn't exist
async function createCancellationTableIfNeeded(supabaseClient: any) {
  try {
    // Check if the table exists
    const { data, error } = await supabaseClient.rpc('check_row_exists', {
      p_table_name: 'information_schema.tables',
      p_column_name: 'table_name',
      p_value: 'subscription_cancellations'
    });

    // If the table doesn't exist, create it
    if (!data) {
      await supabaseClient.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS public.subscription_cancellations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            subscription_id UUID REFERENCES public.subscriptions(id),
            user_id UUID REFERENCES auth.users(id),
            reason TEXT NOT NULL,
            feedback TEXT,
            cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );

          -- Add RLS policies
          ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;

          -- Allow users to read their own cancellations
          CREATE POLICY "Users can read their own cancellations"
            ON public.subscription_cancellations
            FOR SELECT
            USING (
              auth.uid() = user_id OR
              auth.uid() = '00000000-0000-0000-0000-000000000000'
            );
            
          -- Allow users to insert their own cancellations
          CREATE POLICY "Users can insert their own cancellations"
            ON public.subscription_cancellations
            FOR INSERT
            WITH CHECK (
              auth.uid() = user_id OR
              auth.uid() = '00000000-0000-0000-0000-000000000000'
            );
        `
      });
    }
  } catch (error) {
    console.error('Error ensuring subscription_cancellations table exists:', error);
  }
}
