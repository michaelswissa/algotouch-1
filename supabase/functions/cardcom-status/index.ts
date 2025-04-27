
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get CardCom configuration from environment
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
    const cardcomUrl = "https://secure.cardcom.solutions";
    
    logStep("Function started");

    // Get the request body
    const requestData = await req.json();

    // Validate required fields
    if (!requestData.lowProfileCode) {
      logStep("ERROR: Missing required field", { field: "lowProfileCode" });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: lowProfileCode' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    logStep("Checking payment status", { lowProfileCode: requestData.lowProfileCode });
    
    // Call CardCom API to check payment status for real
    const cardcomApiUrl = `${cardcomUrl}/api/v11/LowProfile/GetLpResult`;

    const cardcomPayload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      LowProfileId: requestData.lowProfileCode
    };
    
    logStep("Sending request to CardCom", cardcomPayload);

    const response = await fetch(cardcomApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(cardcomPayload)
    });

    // Get response from CardCom
    const cardcomResponse = await response.json();
    
    logStep("CardCom response received", cardcomResponse);

    // Update the transaction status in the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Check if the transaction exists
        const { data: transaction } = await supabase
          .from('payment_sessions')
          .select('*')
          .eq('low_profile_code', requestData.lowProfileCode)
          .single();
        
        if (transaction) {
          // Determine status based on CardCom response
          let transactionStatus = 'pending';
          
          if (cardcomResponse.ResponseCode === 0) {
            // Success case
            transactionStatus = 'completed';
            
            // If we have transaction info or token info, it's a success
            if (cardcomResponse.TranzactionInfo || cardcomResponse.TokenInfo) {
              transactionStatus = 'completed';
            }
          } else if (cardcomResponse.ResponseCode !== 0) {
            transactionStatus = 'failed';
          }
          
          // Update the transaction status
          await supabase
            .from('payment_sessions')
            .update({ 
              status: transactionStatus, 
              updated_at: new Date().toISOString(),
              transaction_data: cardcomResponse
            })
            .eq('low_profile_code', requestData.lowProfileCode);
            
          logStep("Updated payment session status", { 
            low_profile_code: requestData.lowProfileCode,
            status: transactionStatus
          });
        } else {
          logStep("WARNING: Payment session not found", { 
            low_profile_code: requestData.lowProfileCode 
          });
        }
      } catch (dbError) {
        logStep("ERROR: Database error", { error: dbError.message });
        // Continue even if database query fails
      }
    }

    // Prepare the response
    const result = {
      success: true,
      data: {
        lowProfileCode: requestData.lowProfileCode,
        status: cardcomResponse.ResponseCode === 0 ? 'success' : 'failed',
        timestamp: new Date().toISOString(),
        isComplete: cardcomResponse.ResponseCode === 0,
        details: cardcomResponse.Description || 'No description provided',
        cardcomResponse: cardcomResponse // Include the full CardCom response
      }
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    logStep("ERROR: Exception processing request", { error: error.message });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error checking payment status: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
