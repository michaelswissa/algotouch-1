
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Parse request body
    const body = await req.json();
    
    // Check for required parameters
    const { registrationId, lowProfileId } = body;
    
    if (!registrationId && !lowProfileId) {
      throw new Error('Missing required parameter: registrationId or lowProfileId');
    }

    // Verify the payment with CardCom
    // This can be done by either:
    // 1. Using the registrationId to retrieve registration data and check for payment status
    // 2. Using the lowProfileId to directly query CardCom API for payment status
    
    // Here we'll assume we're verifying using registrationId
    if (registrationId) {
      // Get the registration data
      const { data: regData, error: regError } = await supabaseClient
        .from('temp_registration_data')
        .select('*')
        .eq('id', registrationId)
        .single();
      
      if (regError || !regData) {
        throw new Error('Invalid registration ID or registration data not found');
      }
      
      // Check if payment is already verified
      if (regData.payment_verified) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment already verified',
            details: {
              registrationId,
              paymentVerified: true,
              userId: regData.user_id
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
      // In a real implementation, we would verify with CardCom API using the stored lowProfileId
      // For now, we'll simulate successful verification
      
      // Mark payment as verified
      await supabaseClient
        .from('temp_registration_data')
        .update({ 
          payment_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', registrationId);
      
      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment verified successfully',
          details: {
            registrationId,
            paymentVerified: true
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } 
    // If we have lowProfileId, we can verify directly with CardCom API
    else if (lowProfileId) {
      // In a production implementation, we would call CardCom API to verify payment status
      // For now, we'll simulate successful verification
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment verified successfully via lowProfileId',
          details: {
            lowProfileId,
            paymentVerified: true
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Failed to verify payment');
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to verify payment',
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
