
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // CardCom Configuration
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
    const cardcomBaseUrl = "https://secure.cardcom.solutions";
    
    // Get the lowProfileCode from the request
    const { lowProfileCode } = await req.json();
    
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
    
    logStep("Checking payment status for", { lowProfileCode });
    
    // First try to get from our database
    const { data: paymentSessions, error: dbError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (dbError) {
      logStep("Error querying database:", dbError);
    }
    
    // If we already have a completed status in our database, return that
    if (paymentSessions && paymentSessions.length > 0 && paymentSessions[0].status === 'completed') {
      logStep("Found completed payment in database");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment completed",
          transactionId: paymentSessions[0].transaction_id,
          status: 'completed',
          userId: paymentSessions[0].user_id
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // If not in our database or not completed, check with CardCom API
    const getLowProfileUrl = `${cardcomBaseUrl}/api/v11/LowProfile/GetLowProfileResult`;
    
    const payload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      LowProfileId: lowProfileCode
    };
    
    logStep("Querying CardCom API", payload);
    
    const response = await fetch(getLowProfileUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    const responseData = await response.json();
    logStep("CardCom response", responseData);
    
    // Check if the payment was successful
    const isSuccess = 
      responseData.ResponseCode === 0 && 
      responseData.TranzactionInfo && 
      responseData.TranzactionInfo.ResponseCode === 0;
      
    if (!isSuccess) {
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "Payment not completed",
          error: responseData.Description
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Payment was successful according to CardCom, update our database
    if (paymentSessions && paymentSessions.length > 0) {
      const paymentSession = paymentSessions[0];
      
      // Extract payment details
      const paymentDetails = {
        transaction_id: responseData.TranzactionInfo.TranzactionId?.toString() || null,
        transaction_data: responseData,
        status: 'completed',
        updated_at: new Date().toISOString(),
      };
      
      // Extract token information if available
      let paymentMethod = null;
      if (responseData.TokenInfo && responseData.TokenInfo.Token) {
        paymentMethod = {
          token: responseData.TokenInfo.Token,
          expiryMonth: responseData.TokenInfo.CardMonth?.toString() || '',
          expiryYear: responseData.TokenInfo.CardYear?.toString() || '',
          tokenApprovalNumber: responseData.TokenInfo.TokenApprovalNumber || '',
          cardOwnerIdentityNumber: responseData.TokenInfo.CardOwnerIdentityNumber || '',
          tokenExpiryDate: responseData.TokenInfo.TokenExDate || ''
        };
        
        if (responseData.TranzactionInfo.Last4CardDigits) {
          paymentMethod.lastFourDigits = responseData.TranzactionInfo.Last4CardDigits.toString();
        } else if (responseData.TranzactionInfo.Last4CardDigitsString) {
          paymentMethod.lastFourDigits = responseData.TranzactionInfo.Last4CardDigitsString;
        }
        
        if (responseData.TranzactionInfo.CardInfo) {
          paymentMethod.cardType = responseData.TranzactionInfo.CardInfo;
        }
      }
      
      // Update the payment session with the results
      logStep("Updating payment session", { 
        sessionId: paymentSession.id, 
        status: 'completed'
      });
      
      await supabaseAdmin
        .from('payment_sessions')
        .update({
          ...paymentDetails,
          payment_details: paymentMethod ? { paymentMethod } : paymentSession.payment_details
        })
        .eq('id', paymentSession.id);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment completed",
        transactionId: responseData.TranzactionInfo.TranzactionId?.toString() || null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Failed to check payment status",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
