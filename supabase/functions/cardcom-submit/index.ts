
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Define your CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, supabaseServiceKey);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const { terminalNumber, apiName, cardcomUrl, lowProfileCode, cardholderData, planId, userId } = await req.json();

    if (!terminalNumber || !apiName || !lowProfileCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Processing payment submission for lowProfileCode: ${lowProfileCode}`);

    // Simulate successful payment submission
    // In a real implementation, you would call CardCom's API here
    const result = {
      success: true,
      responseCode: 0,
      description: "Transaction processed successfully",
      lowProfileId: lowProfileCode,
      transactionId: `tr-${Date.now()}`,
      tokenInfo: planId === 'monthly' ? {
        token: `token-${Date.now()}`,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      } : null
    };

    // Store the payment result in the database
    if (userId) {
      try {
        const supabase = createSupabaseClient();
        
        // Record payment attempt
        await supabase
          .from("payment_sessions")
          .update({
            status: "submitted",
            updated_at: new Date().toISOString(),
            metadata: {
              ...result,
              cardholderData: {
                email: cardholderData?.email || null,
                name: cardholderData?.name || null
              }
            }
          })
          .eq("low_profile_code", lowProfileCode);
          
        console.log(`Payment submission recorded for lowProfileCode: ${lowProfileCode}`);
      } catch (dbError) {
        console.error("Error recording payment submission:", dbError);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing payment submission:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
