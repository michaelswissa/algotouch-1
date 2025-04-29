
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase-js";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log("[CARDCOM-WEBHOOK] Received webhook request");
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract data from the webhook
    // CardCom can send both GET and POST requests
    let data: any;
    
    if (req.method === 'GET') {
      // Extract data from URL parameters
      const url = new URL(req.url);
      const returnValue = url.searchParams.get('ReturnValue') || '';
      const responseCode = url.searchParams.get('ResponseCode') || '';
      
      console.log(`[CARDCOM-WEBHOOK] GET webhook - ReturnValue: ${returnValue}, ResponseCode: ${responseCode}`);
      
      // Parse the return value which should be sessionId|lowProfileId
      const [sessionId, lowProfileId] = (returnValue || '').split('|');
      
      data = {
        sessionId,
        lowProfileId,
        responseCode
      };
    } else {
      // Handle POST request
      const bodyText = await req.text();
      console.log(`[CARDCOM-WEBHOOK] POST webhook - Body: ${bodyText}`);
      
      try {
        data = JSON.parse(bodyText);
      } catch (e) {
        // If not JSON, try to parse as form data or URL parameters
        const formData = new URLSearchParams(bodyText);
        data = {
          responseCode: formData.get('ResponseCode'),
          lowProfileId: formData.get('LowProfileId') || formData.get('lowProfileId'),
          sessionId: formData.get('ReturnValue') || ''
        };
      }
    }
    
    // Validate the required fields
    if (!data.sessionId || !data.responseCode) {
      console.error("[CARDCOM-WEBHOOK] Missing required fields in webhook data");
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Extract sessionId if it's in the format "sessionId|lowProfileId"
    let sessionId = data.sessionId;
    let lowProfileId = data.lowProfileId;
    
    if (sessionId && sessionId.includes('|')) {
      const parts = sessionId.split('|');
      sessionId = parts[0];
      lowProfileId = lowProfileId || parts[1];
    }
    
    console.log(`[CARDCOM-WEBHOOK] Processing - SessionID: ${sessionId}, LowProfileID: ${lowProfileId}, ResponseCode: ${data.responseCode}`);
    
    // Update the payment session status
    const status = data.responseCode === '0' ? 'completed' : 'failed';
    
    const { error: updateError } = await supabaseAdmin
      .from('payment_sessions')
      .update({
        status,
        transaction_id: data.TranzactionId || data.transactionId || null,
        payment_details: {
          ...data,
          webhook_received_at: new Date().toISOString()
        }
      })
      .eq('id', sessionId);
    
    if (updateError) {
      console.error(`[CARDCOM-WEBHOOK] Error updating payment session: ${updateError.message}`);
      return new Response(
        JSON.stringify({ success: false, message: "Error updating payment session" }),
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Log the payment
    const { error: logError } = await supabaseAdmin
      .from('user_payment_logs')
      .insert({
        token: lowProfileId,
        transaction_id: data.TranzactionId || data.transactionId || null,
        amount: data.Amount || data.amount || 0,
        status: status === 'completed' ? 'payment_success' : 'payment_failed',
        payment_data: data
      });
    
    if (logError) {
      console.error(`[CARDCOM-WEBHOOK] Error logging payment: ${logError.message}`);
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed successfully" }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error processing webhook';
    console.error(`[CARDCOM-WEBHOOK][ERROR] ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
});
