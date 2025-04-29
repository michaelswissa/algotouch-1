
// Import createClient with the correct path
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Method not allowed' 
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { lowProfileCode, status, redirectType } = await req.json();
    
    if (!lowProfileCode) {
      throw new Error("Missing lowProfileCode parameter");
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update payment status in database
    const { data, error } = await supabaseAdmin
      .from('payment_sessions')
      .update({
        status: status === 'success' ? 'completed' : 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('low_profile_id', lowProfileCode)
      .select('id, user_id, plan_id')
      .single();
    
    if (error) {
      console.error("Error updating payment status:", error);
      throw new Error("Failed to update payment status");
    }
    
    console.log("Payment status updated:", { 
      status, 
      lowProfileCode, 
      sessionId: data?.id 
    });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment status updated successfully",
        data: {
          status,
          session_id: data?.id,
          user_id: data?.user_id,
          plan_id: data?.plan_id
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error in cardcom-redirect:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
