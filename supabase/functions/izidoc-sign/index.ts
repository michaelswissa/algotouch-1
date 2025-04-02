
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SigningRequest {
  userId: string;
  planId: string;
  fullName: string;
  signature: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const IZIDOC_API_KEY = Deno.env.get("IZIDOC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!IZIDOC_API_KEY) {
      throw new Error("Missing Izidoc API credentials");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse the request body
    const { userId, planId, fullName, signature } = await req.json() as SigningRequest;
    
    if (!userId || !planId || !fullName || !signature) {
      throw new Error("Missing required fields");
    }
    
    console.log("Processing digital signature for user:", userId);
    
    // In a real implementation, we would call the Izidoc API here
    // This is a simplified mock implementation
    
    // Generate a mock document ID and signature ID
    const documentId = crypto.randomUUID();
    const signatureId = crypto.randomUUID();
    const signatureTimestamp = new Date().toISOString();
    
    // Update the subscription record to mark contract as signed
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        contract_signed: true,
        contract_signed_at: signatureTimestamp,
        plan_type: planId,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);
      
    if (updateError) {
      console.error("Error updating subscription:", updateError);
      throw updateError;
    }
    
    // Return the signing result
    return new Response(JSON.stringify({
      success: true,
      documentId,
      signatureId,
      signedAt: signatureTimestamp
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing digital signature:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
