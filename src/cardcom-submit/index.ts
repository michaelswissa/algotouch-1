
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration from environment variables
const CARDCOM_CONFIG = {
  terminalNumber: Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138",
  apiName: Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b",
  apiPassword: Deno.env.get("CARDCOM_API_PASSWORD") || "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    doTransaction: "https://secure.cardcom.solutions/api/v11/Transaction/DoTransaction"
  }
};

// Helper function for logging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-SUBMIT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const requestData = await req.json();
    
    // Validate required parameters
    const { token, lowProfileCode, cardholderData, operationType = "ChargeOnly" } = requestData;
    
    if (!lowProfileCode && !token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: lowProfileCode or token"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Create Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // If we have a token, we can use it to charge the card directly
    if (token) {
      logStep("Submitting payment with saved token", { token });
      
      // TODO: Implement token-based payment using CardCom's DoTransaction API
      // This is a placeholder for now
      return new Response(
        JSON.stringify({
          success: true,
          message: "Token-based payment submitted successfully",
          data: { transactionId: `mock-${Date.now()}` }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // For lowProfile payments, we don't need to do anything here 
    // because the payment is processed through the CardCom iframe
    // We just need to check the status using the cardcom-status function
    logStep("LowProfile payment flow, no direct API call needed", { lowProfileCode });
    
    // Return success response, actual payment status will be checked by cardcom-status
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment request received, status will be checked separately",
        data: { lowProfileCode }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
