
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const requestData = await req.json();

    // Validate required fields
    if (!requestData.lowProfileCode || !requestData.terminalNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: lowProfileCode and terminalNumber are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Here would be the actual CardCom API integration
    // For demonstration purposes, we'll simulate a successful response
    const simulatedResponse = {
      success: true,
      data: {
        lowProfileCode: requestData.lowProfileCode,
        sessionId: `session-${Date.now()}`,
        transactionId: `txn-${Date.now()}`,
        status: 'pending',
        cardholderName: requestData.cardholderData?.name || '',
        cardholderEmail: requestData.cardholderData?.email || '',
        operationType: requestData.operationType || 'ChargeOnly',
        planId: requestData.planId || '',
      }
    };

    // In a real implementation, you would:
    // 1. Call the CardCom API to process the payment
    // 2. Store the result in the database
    // 3. Return the appropriate response

    // Let's simulate storing the transaction in the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Record the transaction
        await supabase
          .from('payment_transactions')
          .insert({
            low_profile_code: requestData.lowProfileCode,
            terminal_number: requestData.terminalNumber,
            operation_type: requestData.operationType || 'ChargeOnly',
            status: 'pending',
            cardholder_name: requestData.cardholderData?.name || '',
            cardholder_email: requestData.cardholderData?.email || '',
            plan_id: requestData.planId || '',
            session_data: simulatedResponse.data,
          });
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Continue even if database insert fails
      }
    }

    return new Response(
      JSON.stringify(simulatedResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error("Error processing payment submission:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error processing payment submission: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
