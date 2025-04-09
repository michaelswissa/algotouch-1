
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get request body
    const { sessionId, userId, email, planId, paymentDetails, expiresAt } = await req.json();

    // Store session data
    const { data, error } = await supabase
      .from('payment_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        email,
        plan_id: planId,
        payment_details: paymentDetails,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing payment session:', error);
      throw error;
    }

    console.log(`Payment session ${sessionId} saved successfully`);

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
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
