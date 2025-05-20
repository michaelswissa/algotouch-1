
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";
import { validate as validateUUID } from "https://deno.land/std@0.168.0/uuid/mod.ts";

interface RequestBody {
  registrationId: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Parse request 
  let body: RequestBody;
  try {
    body = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid request body" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  const { registrationId } = body;
  
  if (!registrationId) {
    return new Response(
      JSON.stringify({ success: false, error: "Registration ID is required" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  // Initialize Supabase client
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log(`Retrieving registration data for ID: ${registrationId}`);
    
    // Check if the registration ID is a valid UUID
    const isValidUUID = validateUUID(registrationId);
    
    // Different query based on whether it's a UUID or not
    let data;
    let error;
    
    if (isValidUUID) {
      // Retrieve from temp_registration_data table using UUID
      const result = await supabaseAdmin
        .from('temp_registration_data')
        .select('*')
        .eq('id', registrationId)
        .single();
        
      data = result.data;
      error = result.error;
    } else {
      // For backwards compatibility - handle non-UUID IDs
      // You might need a different approach here depending on your database structure
      console.log("Non-UUID registration ID format detected, using legacy handler");
      
      // This is a simplified example - adjust according to your actual data storage
      const result = await supabaseAdmin
        .from('temp_registration_data')
        .select('*')
        .like('id', `%${registrationId}%`)
        .maybeSingle();
        
      data = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error("Error retrieving registration data:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to retrieve registration data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!data) {
      console.log("Registration data not found for ID:", registrationId);
      return new Response(
        JSON.stringify({ success: false, error: "Registration data not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    console.log("Retrieved registration data successfully");
    
    // Return the registration data
    return new Response(
      JSON.stringify({ 
        success: true, 
        registrationData: data.registration_data,
        alreadyUsed: data.used
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Exception in get-registration-data:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
