
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Received webhook request from Cardcom');
    
    // Parse the webhook payload
    const webhookData = await req.json();
    console.log('Webhook payload:', JSON.stringify(webhookData));
    
    // Check if the transaction was successful
    if (webhookData.ResponseCode === 0 && webhookData.TranzactionInfo?.TranzactionId) {
      console.log('Transaction successful:', webhookData.TranzactionInfo.TranzactionId);
      
      // Process the payment data
      const planId = webhookData.ReturnValue;
      const transactionId = webhookData.TranzactionInfo.TranzactionId;
      
      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Here you would typically:
        // 1. Update the user's subscription status
        // 2. Process any registration data if this was part of registration flow
        // 3. Record the payment in your database
        
        console.log('Processing webhook for plan:', planId, 'with transaction ID:', transactionId);
        
        // Check if this is a registration payment
        const { data: registrationData } = await supabase
          .from('temp_registration_data')
          .select('*')
          .eq('used', false)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (registrationData && registrationData.length > 0) {
          console.log('Found temporary registration data, processing new user registration');
          
          // Mark the data as used
          await supabase
            .from('temp_registration_data')
            .update({ used: true })
            .eq('id', registrationData[0].id);
            
          // Further processing would happen here based on your application's requirements
        }
      }
    } else {
      console.log('Transaction was not successful or incomplete');
    }
    
    // Respond with a success status (this is important for Cardcom to know we received the webhook)
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Even on error, return a success response to Cardcom to prevent retries
    return new Response(
      JSON.stringify({ 
        success: true,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Always return 200 to Cardcom
      }
    );
  }
});
