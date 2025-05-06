
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CARDCOM-STATUS] Function started");
    
    // Parse the request body
    const { sessionId } = await req.json();
    console.log(`[CARDCOM-STATUS] Checking status for session ID: ${sessionId}`);

    if (!sessionId) {
      throw new Error("Missing required parameter: sessionId");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Retrieve payment session from database
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      console.error("[CARDCOM-STATUS] Error fetching session:", sessionError.message);
      throw new Error(`Error fetching session data: ${sessionError.message}`);
    }
    
    if (!session) {
      throw new Error(`Payment session not found: ${sessionId}`);
    }
    
    console.log(`[CARDCOM-STATUS] Payment session found, status: ${session.status}`);
    
    // Map session status to response format
    let responseStatus = 'pending';
    if (session.status === 'completed') {
      responseStatus = 'success';
    } else if (session.status === 'failed') {
      responseStatus = 'failed';
    }
    
    // Return the session status
    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment status retrieved`,
        data: {
          status: responseStatus,
          sessionId: session.id,
          transactionId: session.transaction_id,
          paymentDetails: session.payment_details,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('[CARDCOM-STATUS] Error:', error instanceof Error ? error.message : String(error));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage
      }),
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
