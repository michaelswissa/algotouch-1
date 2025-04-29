
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for cross-domain requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Method not allowed' 
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { 
      sessionId
    } = await req.json();
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing session ID parameter' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[CARDCOM-STATUS] Checking status for session ID: ${sessionId}`);

    // Query the payment_sessions table to get the current status
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
      
    if (sessionError) {
      throw new Error("Error fetching session data: " + sessionError.message);
    }
    
    if (!sessionData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Session not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if the payment has been processed
    const status = sessionData.status;
    const isExpired = new Date(sessionData.expires_at) < new Date();
    
    let statusResponse;
    if (status === 'completed') {
      statusResponse = {
        success: true,
        message: 'Payment completed successfully',
        data: {
          status: 'success',
          sessionData
        }
      };
    } else if (status === 'failed') {
      statusResponse = {
        success: true,
        message: 'Payment failed',
        data: {
          status: 'failed',
          sessionData
        }
      };
    } else if (isExpired) {
      // If the session is expired, mark it as failed in the database
      await supabaseAdmin
        .from('payment_sessions')
        .update({ status: 'expired' })
        .eq('id', sessionId);
        
      statusResponse = {
        success: true,
        message: 'Payment session has expired',
        data: {
          status: 'expired',
          sessionData: { ...sessionData, status: 'expired' }
        }
      };
    } else {
      // Session is still active but payment is not yet completed
      statusResponse = {
        success: true,
        message: 'Payment is still processing',
        data: {
          status: 'processing',
          sessionData
        }
      };
    }

    return new Response(
      JSON.stringify(statusResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error checking payment status';
    console.error(`[CARDCOM-STATUS][ERROR] ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
