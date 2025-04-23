import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lowProfileCode, sessionId, timestamp, attempt, operationType } = await req.json();
    
    console.log('Payment status check request:', { 
      lowProfileCode, 
      sessionId, 
      attempt, 
      operationType
    });

    if (!lowProfileCode || !sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters",
          processing: false,
          failed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching payment session:', sessionError);
      return new Response(
        JSON.stringify({
          success: false, 
          message: "Payment session not found",
          processing: true,
          error: sessionError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session data found:', {
      status: sessionData.status,
      hasTransactionId: !!sessionData.transaction_id
    });

    if (sessionData.status === 'completed' && sessionData.transaction_id) {
      const tokenOperation = operationType === 'token_only';
      
      return new Response(
        JSON.stringify({
          success: true,
          message: tokenOperation ? "Token created successfully" : "Payment completed successfully",
          processing: false,
          data: {
            transactionId: sessionData.transaction_id,
            isTokenOperation: tokenOperation,
            token: tokenOperation ? sessionData.transaction_id : null
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sessionData.status === 'failed') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment failed",
          processing: false,
          failed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: paymentLogs } = await supabaseAdmin
      .from('payment_logs')
      .select('*')
      .eq('transaction_id', lowProfileCode)
      .single();

    if (paymentLogs) {
      console.log('Found completed payment in logs:', paymentLogs);
      
      await supabaseAdmin
        .from('payment_sessions')
        .update({
          status: 'completed',
          transaction_id: paymentLogs.transaction_id
        })
        .eq('id', sessionId);
        
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment completed (found in logs)",
          processing: false,
          data: {
            transactionId: paymentLogs.transaction_id,
            isTokenOperation: operationType === 'token_only'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (operationType === 'token_only' && sessionData.payment_method?.token) {
      await supabaseAdmin
        .from('payment_sessions')
        .update({
          status: 'completed',
          transaction_id: sessionData.payment_method.token
        })
        .eq('id', sessionId);
        
      return new Response(
        JSON.stringify({
          success: true,
          message: "Token created successfully",
          processing: false,
          data: {
            isTokenOperation: true,
            token: sessionData.payment_method.token
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sessionData.user_id) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', sessionData.user_id)
        .eq('plan_type', sessionData.plan_id)
        .eq('status', 'active')
        .maybeSingle();
        
      if (subscription) {
        console.log('Found active subscription:', subscription);
        
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: 'completed',
            transaction_id: subscription.id
          })
          .eq('id', sessionId);
          
        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription is active",
            processing: false,
            data: {
              transactionId: subscription.id,
              isTokenOperation: operationType === 'token_only'
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (attempt > 30) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment processing timeout",
          processing: false,
          timeout: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "Payment is still processing",
        processing: true,
        attempt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
        processing: false,
        error: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
