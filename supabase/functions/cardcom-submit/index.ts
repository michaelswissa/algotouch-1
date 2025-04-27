
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
  console.log(`[CARDCOM-SUBMIT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const requestData = await req.json();
    
    logStep("Function started", { requestType: "submit payment" });

    // Validate required fields
    if (!requestData.lowProfileCode || !requestData.terminalNumber) {
      logStep("ERROR: Missing required fields", { 
        has_lowProfileCode: !!requestData.lowProfileCode,
        has_terminalNumber: !!requestData.terminalNumber
      });
      
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

    // Note: For CardCom's LowProfile flow, this function isn't actually needed for initial payment
    // as the payment is processed on CardCom's side after redirect.
    // This function would be used for recurring payments using saved tokens.
    
    // For recurring payments (using token), you would use the ChargeToken API:
    // https://secure.cardcom.solutions/Interface/ChargeToken.aspx
    
    logStep("This function is primarily for recurring payments using saved tokens");
    
    // Check if this is a recurring payment using a token
    if (requestData.token && requestData.amount) {
      logStep("Processing recurring payment with token", { 
        token: requestData.token.substring(0, 8) + '...',
        amount: requestData.amount
      });
      
      // Get CardCom configuration from environment
      const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || requestData.terminalNumber;
      const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
      const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD") || "i9nr6caGbgheTdYfQbo6";
      const cardcomUrl = "https://secure.cardcom.solutions";
      
      // Prepare URL-encoded form data for token charge
      const formData = new URLSearchParams();
      formData.append('TerminalNumber', terminalNumber);
      formData.append('UserName', apiName);
      formData.append('TokenToCharge_Token', requestData.token);
      formData.append('TokenToCharge_CardValidityMonth', requestData.cardMonth || '');
      formData.append('TokenToCharge_CardValidityYear', requestData.cardYear || '');
      formData.append('TokenToCharge_SumToBill', requestData.amount.toString());
      formData.append('TokenToCharge_APILevel', '10');
      formData.append('TokenToCharge_CoinID', '1'); // ILS
      formData.append('TokenToCharge_ProductName', requestData.productName || 'חיוב מנוי');
      formData.append('TokenToCharge_UserPassword', apiPassword);
      formData.append('TokenToCharge_IsRecurringPayment', 'true');
      
      // Call CardCom API to charge the token
      const response = await fetch(`${cardcomUrl}/Interface/ChargeToken.aspx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });
      
      // Parse response
      const responseText = await response.text();
      const responseData = new URLSearchParams(responseText);
      
      const responseCode = responseData.get('ResponseCode');
      const internalDealNumber = responseData.get('InternalDealNumber');
      
      logStep("CardCom token charge response", { 
        responseCode,
        internalDealNumber,
        responseText
      });
      
      if (responseCode !== '0') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: responseData.get('Description') || 'Unknown error from payment processor' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Return successful response
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transactionId: internalDealNumber,
            status: 'success',
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // For initial payment tracking
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Record the payment attempt
        await supabase
          .from('payment_sessions')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('low_profile_code', requestData.lowProfileCode);
          
        logStep("Updated payment session to processing", { lowProfileCode: requestData.lowProfileCode });
      } catch (dbError) {
        logStep("ERROR: Database error", { error: dbError.message });
        // Continue even if database insert fails
      }
    }

    // Return tracking information response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          lowProfileCode: requestData.lowProfileCode,
          sessionId: `session-${Date.now()}`,
          status: 'processing',
          message: 'Payment processing has been initiated on CardCom side, check status to complete'
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    logStep("ERROR: Exception processing payment submission", { error: error.message });
    
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
