
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers to ensure the API can be called from the frontend
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
        headers: corsHeaders 
      }
    );
  }

  try {
    // Parse request body
    const { lowProfileCode, sessionId } = await req.json();
    
    if (!lowProfileCode || !sessionId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required parameters' 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    console.log(`[CARDCOM-STATUS] Checking payment status for session: ${sessionId}, lowProfileCode: ${lowProfileCode}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check payment status in database
    const { data: paymentSession, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('low_profile_id', lowProfileCode)
      .maybeSingle();
    
    if (sessionError) {
      throw new Error(`Error fetching payment session: ${sessionError.message}`);
    }
    
    if (!paymentSession) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payment session not found',
          data: {
            status: 'not_found'
          }
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }

    // Check if there are any payment logs for this session
    const { data: paymentLogs, error: logsError } = await supabaseAdmin
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileCode)
      .order('created_at', { ascending: false })
      .limit(1);

    if (logsError) {
      console.error(`Error fetching payment logs: ${logsError.message}`);
    }
    
    // Determine payment status
    let status = 'pending';
    let message = 'Payment is being processed';
    
    if (paymentSession.status === 'completed' || (paymentLogs && paymentLogs[0]?.status === 'payment_success')) {
      status = 'success';
      message = 'Payment completed successfully';
    } else if (paymentSession.status === 'failed' || (paymentLogs && paymentLogs[0]?.status === 'payment_failed')) {
      status = 'failed';
      message = 'Payment failed';
    } else if (paymentSession.status === 'expired' || new Date(paymentSession.expires_at) < new Date()) {
      status = 'expired';
      message = 'Payment session expired';
    }

    console.log(`[CARDCOM-STATUS] Status determined: ${status} for session: ${sessionId}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message,
        data: {
          status,
          lowProfileCode,
          sessionId,
          paymentDate: paymentLogs && paymentLogs[0] ? paymentLogs[0].created_at : null,
          paymentStatus: paymentLogs && paymentLogs[0] ? paymentLogs[0].status : null
        }
      }),
      { 
        status: 200, 
        headers: corsHeaders 
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
        headers: corsHeaders 
      }
    );
  }
});
