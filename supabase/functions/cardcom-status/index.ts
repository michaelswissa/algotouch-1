
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";

// Helper function for logging
function logStep(functionName: string, step: string, data: any = {}) {
  console.log(`[${functionName}][${step}]`, JSON.stringify(data));
}

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("CARDCOM-STATUS", "Function started");
    
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      logStep("CARDCOM-STATUS", "Request body parsed", requestBody);
    } catch (parseError) {
      logStep("CARDCOM-STATUS", "Error parsing request body", { error: parseError.message });
      throw new Error("Invalid JSON body");
    }
    
    const { sessionId } = requestBody;
    logStep("CARDCOM-STATUS", "Checking status for session ID", { sessionId });

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
      logStep("CARDCOM-STATUS", "Error fetching session", { error: sessionError.message });
      throw new Error(`Error fetching session data: ${sessionError.message}`);
    }
    
    if (!session) {
      logStep("CARDCOM-STATUS", "Payment session not found", { sessionId });
      throw new Error(`Payment session not found: ${sessionId}`);
    }
    
    logStep("CARDCOM-STATUS", "Payment session found", { 
      status: session.status,
      created_at: session.created_at,
      expires_at: session.expires_at,
      plan_id: session.plan_id,
      operation_type: session.operation_type
    });
    
    // Map session status to response format
    let responseStatus = 'pending';
    if (session.status === 'completed') {
      responseStatus = 'success';
    } else if (session.status === 'failed') {
      responseStatus = 'failed';
    } else if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
      responseStatus = 'expired';
      
      // If the session has expired but not marked as expired, update it
      if (session.status !== 'expired' && new Date(session.expires_at) < new Date()) {
        logStep("CARDCOM-STATUS", "Marking expired session", { sessionId });
        await supabaseAdmin
          .from('payment_sessions')
          .update({ status: 'expired' })
          .eq('id', sessionId);
      }
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
          token: session.token,
          tokenApprovalNumber: session.token_approval_number,
          internalDealNumber: session.internal_deal_number,
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
    logStep("CARDCOM-STATUS", "Error", { message: error instanceof Error ? error.message : String(error) });
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
