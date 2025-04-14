
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const { lowProfileId, planId } = await req.json();
    
    if (!lowProfileId) {
      throw new Error('Missing required parameter: lowProfileId');
    }
    
    console.log(`Checking payment status for profile ID: ${lowProfileId}`);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First check payment logs table for completed transactions
    const { data: paymentLog, error: logError } = await supabaseClient
      .from('payment_logs')
      .select('*')
      .eq('lowprofile_id', lowProfileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (logError) {
      console.error('Error fetching payment log:', logError);
    }
    
    // Check if we've already processed this payment successfully
    if (paymentLog?.status === 'completed') {
      console.log(`Found completed payment log for ${lowProfileId}`);
      return new Response(
        JSON.stringify({
          success: true,
          ResponseCode: 0,
          OperationResponse: '0',
          paymentLog,
          message: 'Payment was completed successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get payment session details
    const { data: session, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('id', lowProfileId)
      .maybeSingle();
      
    if (sessionError) {
      console.error('Error fetching payment session:', sessionError);
      throw new Error(`Could not find payment session with ID: ${lowProfileId}`);
    }
    
    if (!session) {
      throw new Error(`Payment session with ID ${lowProfileId} not found`);
    }
    
    console.log(`Found payment session: ${session.id}, checking payment status`);
    
    // If the session has payment details, return them
    if (session.payment_details && 
        (session.payment_details.status === 'completed' || 
         session.payment_details.OperationResponse === '0' || 
         session.payment_details.ResponseCode === 0)) {
         
      return new Response(
        JSON.stringify({
          success: true,
          ...session.payment_details,
          message: 'Payment was completed successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if there's a subscription that was created for this user and plan
    if (session.user_id) {
      const { data: subscription, error: subError } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user_id)
        .eq('plan_type', planId || session.plan_id)
        .maybeSingle();
        
      if (subError) {
        console.error('Error checking subscription:', subError);
      }
      
      // If we found a subscription, the payment was likely successful
      if (subscription && subscription.status !== 'cancelled') {
        return new Response(
          JSON.stringify({
            success: true,
            ResponseCode: 0,
            subscription,
            message: 'Subscription found for this payment'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }
    
    // Payment status wasn't found in our system
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Payment not yet completed or not found',
        session: {
          id: session.id,
          plan_id: session.plan_id,
          expires_at: session.expires_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
