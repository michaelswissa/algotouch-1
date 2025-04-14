
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get webhook data - CardCom sends data in request body 
    let webhookData;
    
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      webhookData = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      webhookData = Object.fromEntries(formData.entries());
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }
    
    console.log("Webhook data:", webhookData);
    
    // Extract required fields from webhook data
    const { 
      LowProfileId: lowProfileCode,
      OperationResponse: operationResponse,
      ReturnValue: returnValue,
      InternalDealNumber: transactionId,
      TranzactionInfo: transactionInfo
    } = webhookData;
    
    if (!lowProfileCode) {
      throw new Error("Missing LowProfileId in webhook data");
    }
    
    // Find matching payment session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .single();
      
    if (sessionError || !sessionData) {
      throw new Error(`Payment session not found for LowProfileId: ${lowProfileCode}`);
    }
    
    // Update payment status
    const isSuccessful = operationResponse === "0";
    const status = isSuccessful ? 'completed' : 'failed';
    
    const { error: updateError } = await supabaseAdmin
      .from('payment_sessions')
      .update({
        status,
        transaction_id: transactionId,
        transaction_data: webhookData
      })
      .eq('id', sessionData.id);
      
    if (updateError) {
      throw new Error(`Failed to update payment session: ${updateError.message}`);
    }
    
    // Log the transaction
    const { error: logError } = await supabaseAdmin
      .from(isSuccessful ? 'payment_logs' : 'payment_errors')
      .insert({
        user_id: sessionData.user_id,
        transaction_id: transactionId,
        amount: sessionData.amount,
        currency: sessionData.currency,
        ...(isSuccessful 
          ? { 
              plan_id: sessionData.plan_id,
              payment_status: 'succeeded',
              payment_data: webhookData 
            }
          : { 
              error_code: operationResponse,
              error_message: webhookData.Description || 'Payment failed',
              request_data: { low_profile_code: lowProfileCode, return_value: returnValue },
              response_data: webhookData
            })
      });
    
    if (logError) {
      console.error("Error logging transaction:", logError);
    }
    
    // Return success response to CardCom
    return new Response("OK", { 
      status: 200, 
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  } catch (error) {
    console.error("Error in cardcom-webhook function:", error);
    return new Response(
      error.message || "Webhook processing failed",
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        },
      }
    );
  }
});
