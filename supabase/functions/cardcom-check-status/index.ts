
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

serve(async (req) => {
  try {
    console.log("Payment status check request received");
    
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const requestData = await req.json();
    const { lowProfileId, planId } = requestData;
    
    if (!lowProfileId) {
      console.error("Missing lowProfileId parameter");
      throw new Error('Missing lowProfileId parameter');
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check payment log status
    const { data: paymentLog } = await supabaseClient
      .from('payment_logs')
      .select('*')
      .eq('lowprofile_id', lowProfileId)
      .maybeSingle();
      
    // If payment log exists and status is completed, return success
    if (paymentLog && paymentLog.status === 'completed') {
      console.log("Found completed payment in logs:", paymentLog.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          ResponseCode: 0,
          OperationResponse: '0',
          paymentLog
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Get payment session details
    const { data: sessionData } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('id', lowProfileId)
      .maybeSingle();
    
    // If we don't have a session, try to get status directly from Cardcom
    if (!sessionData && !paymentLog) {
      console.log("No session or payment log found, checking with Cardcom directly");
      
      // Get the Cardcom API credentials
      const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
      const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
      
      if (!terminalNumber || !apiName) {
        throw new Error('Missing Cardcom API credentials');
      }
      
      // Prepare parameters for Cardcom status check
      const formData = new FormData();
      formData.append('TerminalNumber', terminalNumber);
      formData.append('UserName', apiName);
      formData.append('LowProfileCode', lowProfileId);
      
      // Call Cardcom API to check payment status
      try {
        const cardcomResponse = await fetch(
          'https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx',
          { method: 'POST', body: formData }
        );
        
        // Get response text
        const responseText = await cardcomResponse.text();
        console.log("Cardcom status response:", responseText);
        
        let statusData;
        try {
          // Try to parse as JSON first
          statusData = JSON.parse(responseText);
        } catch (parseError) {
          // If not JSON, try to parse URL parameters
          const params = new URLSearchParams(responseText);
          statusData = {};
          for (const [key, value] of params.entries()) {
            statusData[key] = value;
          }
        }
        
        // Update payment log with status data
        if (paymentLog) {
          await supabaseClient
            .from('payment_logs')
            .update({
              status: statusData.OperationResponse === '0' ? 'completed' : 'failed',
              payment_data: statusData,
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentLog.id);
        } else {
          // Create new payment log if none exists
          await supabaseClient
            .from('payment_logs')
            .insert({
              lowprofile_id: lowProfileId,
              status: statusData.OperationResponse === '0' ? 'completed' : 'failed',
              plan_id: planId || null,
              payment_data: statusData
            });
        }
        
        // Return the status data
        return new Response(
          JSON.stringify(statusData),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (fetchError) {
        console.error("Error fetching status from Cardcom:", fetchError);
        throw fetchError;
      }
    }
    
    // Return session data if no specific status found
    return new Response(
      JSON.stringify({ 
        success: true,
        sessionData,
        paymentLog,
        message: "Payment status pending or unknown"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Status check error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
