
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Create Supabase admin client for database operations that bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Parse request payload
    const { lowProfileCode, sessionId } = await req.json();
    
    if (!lowProfileCode) {
      throw new Error("Missing required parameter: lowProfileCode");
    }
    
    logStep("Checking payment status", { lowProfileCode, sessionId });
    
    // Call CardCom API to get payment status
    const cardcomPayload = new URLSearchParams({
      terminalnumber: Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138",
      username: Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b",
      lowprofilecode: lowProfileCode
    }).toString();
    
    const cardcomResponse = await fetch(
      "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx", 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: cardcomPayload,
      }
    );
    
    if (!cardcomResponse.ok) {
      throw new Error(`CardCom API error: ${cardcomResponse.status} ${cardcomResponse.statusText}`);
    }
    
    // Parse CardCom response
    const responseText = await cardcomResponse.text();
    const responseParams = new URLSearchParams(responseText);
    
    // Extract key information
    const operationResponse = responseParams.get('OperationResponse');
    const dealResponse = responseParams.get('DealResponse');
    const transactionId = responseParams.get('InternalDealNumber');
    const returnValue = responseParams.get('ReturnValue');
    
    logStep("CardCom status response", { 
      operationResponse, 
      dealResponse,
      transactionId,
      returnValue
    });
    
    // Determine payment success based on CardCom response
    const isSuccessful = operationResponse === '0';
    
    if (isSuccessful && sessionId && !sessionId.startsWith('temp-')) {
      // Update session status in database if available
      try {
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: 'completed',
            transaction_id: transactionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
        
        logStep("Updated payment session status", { sessionId, status: 'completed' });
      } catch (dbError) {
        logStep("Database error (non-fatal)", { error: dbError.message });
        // Continue even if DB update fails
      }
    }
    
    // Return payment status information
    return new Response(
      JSON.stringify({
        success: isSuccessful,
        failed: !isSuccessful,
        message: responseParams.get('Description') || '',
        data: {
          operationResponse,
          dealResponse,
          transactionId,
          returnValue
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Payment status check failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
