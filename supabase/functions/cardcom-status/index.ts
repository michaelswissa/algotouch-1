
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-STATUS] ${step}${detailsStr}`);
};

// CardCom Configuration
const CARDCOM_CONFIG = {
  terminalNumber: Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138",
  apiName: Deno.env.get("CARDCOM_API_NAME") || "",
  endpoints: {
    getLowProfileResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLowProfileResult"
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Create Supabase admin client for database operations that bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { lowProfileCode } = await req.json();
    
    logStep("Checking status for lowProfileCode", { lowProfileCode });

    if (!lowProfileCode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing lowProfileCode parameter",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // First check if we already have a completed session in our database
    const { data: existingSession, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (sessionError) {
      logStep("Error checking existing session", { error: sessionError });
    } else if (existingSession && existingSession.length > 0) {
      const session = existingSession[0];
      logStep("Found existing session", { 
        status: session.status,
        transactionId: session.transaction_id 
      });
      
      // If the session is completed or failed, return the status
      if (session.status === 'completed' || session.status === 'failed') {
        return new Response(
          JSON.stringify({
            success: true,
            status: session.status,
            transactionId: session.transaction_id,
            paymentDetails: session.payment_details
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    // If not found or not completed, call CardCom API to check status
    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      LowProfileId: lowProfileCode
    };
    
    logStep("Checking status with CardCom API");
    
    try {
      const response = await fetch(CARDCOM_CONFIG.endpoints.getLowProfileResult, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cardcomPayload),
      });
      
      const responseData = await response.json();
      
      logStep("CardCom response", responseData);
      
      if (responseData.ResponseCode !== 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: responseData.Description || "CardCom status check failed",
            cardcomResponse: responseData
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Extract payment details
      const paymentStatus = responseData.TokenInfo ? 'completed' : 'pending';
      let transactionId = null;
      let paymentDetails = null;
      
      if (responseData.TranzactionInfo) {
        transactionId = responseData.TranzactionInfo.TranzactionId?.toString();
        paymentDetails = responseData.TranzactionInfo;
      }
      
      if (responseData.TokenInfo) {
        paymentDetails = {
          ...paymentDetails || {},
          tokenInfo: responseData.TokenInfo
        };
      }
      
      // Update the payment session in our database if transaction is completed
      if (paymentStatus === 'completed' && existingSession && existingSession.length > 0) {
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: 'completed',
            transaction_id: transactionId,
            transaction_data: responseData,
            payment_details: paymentDetails,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSession[0].id);
          
        logStep("Updated payment session", { 
          sessionId: existingSession[0].id, 
          status: 'completed' 
        });
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          status: paymentStatus,
          transactionId: transactionId,
          cardcomResponse: responseData
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (fetchError) {
      logStep("Error fetching from CardCom", { error: fetchError.message });
      
      return new Response(
        JSON.stringify({
          success: false,
          message: "Error fetching from CardCom: " + fetchError.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Status check failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
