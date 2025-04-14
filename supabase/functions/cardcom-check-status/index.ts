
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log('Checking payment status');
    
    // Parse request body
    const { lowProfileId, planId } = await req.json();
    
    if (!lowProfileId) {
      throw new Error('Missing lowProfileId parameter');
    }
    
    console.log(`Checking payment status for: ${lowProfileId}`);
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check for payment in user_payment_logs
    const { data: paymentLog, error: paymentError } = await supabaseAdmin
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .maybeSingle();
    
    if (paymentError) {
      console.error('Error checking payment logs:', paymentError);
      throw new Error(`Error checking payment logs: ${paymentError.message}`);
    }
    
    if (paymentLog) {
      console.log('Found payment log:', {
        status: paymentLog.status,
        amount: paymentLog.amount,
        userId: paymentLog.user_id,
        transactionDetails: !!paymentLog.transaction_details
      });
      
      const isSuccess = paymentLog.status === 'completed';
      
      return new Response(
        JSON.stringify({
          ResponseCode: isSuccess ? 0 : 1,
          Description: isSuccess ? 'Payment completed successfully' : 'Payment failed',
          OperationResponse: isSuccess ? '0' : '1',
          paymentLog,
          planId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If not found in payment logs, check the payment session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('payment_details->lowProfileId', lowProfileId)
      .maybeSingle();
    
    if (sessionError) {
      console.error('Error checking payment session:', sessionError);
    }
    
    if (sessionData) {
      const sessionStatus = sessionData.payment_details?.status || 'pending';
      const isCompleted = sessionStatus === 'completed';
      
      console.log('Found session data:', {
        id: sessionData.id,
        status: sessionStatus,
        userId: sessionData.user_id,
        planId: sessionData.payment_details?.planId
      });
      
      return new Response(
        JSON.stringify({
          ResponseCode: isCompleted ? 0 : 1,
          Description: isCompleted ? 'Payment completed successfully' : 'Payment pending or failed',
          OperationResponse: isCompleted ? '0' : '1',
          paymentSession: sessionData,
          planId: sessionData.payment_details?.planId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // No payment found
    return new Response(
      JSON.stringify({
        ResponseCode: 1,
        Description: 'Payment not found',
        OperationResponse: '1'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({ 
        ResponseCode: 999,
        Description: error instanceof Error ? error.message : 'Unknown error processing payment check',
        OperationResponse: '999'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
