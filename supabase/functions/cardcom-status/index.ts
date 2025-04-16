
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
    let lowProfileCode, sessionId;
    
    try {
      const payload = await req.json();
      lowProfileCode = payload.lowProfileCode;
      sessionId = payload.sessionId;
      
      logStep("Request payload parsed", { lowProfileCode, sessionId });
    } catch (parseError) {
      logStep("Error parsing request body", { error: parseError.message });
      throw new Error("Invalid request format");
    }
    
    if (!lowProfileCode) {
      throw new Error("Missing required parameter: lowProfileCode");
    }
    
    logStep("Checking payment status", { lowProfileCode, sessionId });
    
    // Add a short delay to allow CardCom to process the payment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Call CardCom API to get payment status
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
    
    logStep("Using CardCom credentials", { terminalNumber, apiNameLength: apiName?.length || 0 });
    
    const cardcomPayload = new URLSearchParams({
      terminalnumber: terminalNumber,
      username: apiName,
      lowprofilecode: lowProfileCode
    }).toString();
    
    logStep("Sending request to CardCom API", { url: "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx" });
    
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
      logStep("CardCom API error response", { 
        status: cardcomResponse.status, 
        statusText: cardcomResponse.statusText 
      });
      throw new Error(`CardCom API error: ${cardcomResponse.status} ${cardcomResponse.statusText}`);
    }
    
    // Parse CardCom response
    const responseText = await cardcomResponse.text();
    logStep("Raw CardCom response", { responseText });
    
    const responseParams = new URLSearchParams(responseText);
    
    // Extract key information
    const operationResponse = responseParams.get('OperationResponse');
    const dealResponse = responseParams.get('DealResponse');
    const transactionId = responseParams.get('InternalDealNumber');
    const returnValue = responseParams.get('ReturnValue');
    const description = responseParams.get('Description');
    
    logStep("CardCom status response", { 
      operationResponse, 
      dealResponse,
      transactionId,
      returnValue,
      description
    });
    
    // Return early if transaction is not complete
    if (!operationResponse) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'העסקה עדיין בעיבוד...',
          data: {
            operationResponse,
            dealResponse,
            description,
            cardcomResponse: {
              status: cardcomResponse.status,
              ok: cardcomResponse.ok
            }
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Determine payment success based on CardCom response
    const isSuccessful = operationResponse === '0';
    
    // Update session status in database if available
    if (isSuccessful && sessionId) {
      try {
        // Only update real DB sessions (not temp ones)
        if (!sessionId.startsWith('temp-')) {
          const updateResult = await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: transactionId,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
          
          logStep("Database update result", { 
            status: updateResult.status, 
            error: updateResult.error?.message || null 
          });
        } else {
          logStep("Skipping DB update for temporary session", { sessionId });
        }
      } catch (dbError: any) {
        logStep("Database error (non-fatal)", { error: dbError.message });
        // Continue even if DB update fails - webhook will handle this
      }
    }
    
    // Return payment status information
    return new Response(
      JSON.stringify({
        success: isSuccessful,
        failed: !isSuccessful,
        message: description || '',
        data: {
          operationResponse,
          dealResponse,
          transactionId,
          returnValue,
          cardcomResponse: {
            status: cardcomResponse.status,
            ok: cardcomResponse.ok
          }
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
        message: errorMessage || "בדיקת סטטוס התשלום נכשלה",
        error: true
      }),
      {
        status: 200, // Return 200 even for errors to prevent retry loops
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
