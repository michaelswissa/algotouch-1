
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced logging function with structured output
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-STATUS] ${step}${detailsStr}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lowProfileCode, sessionId, timestamp, attempt, operationType } = await req.json();
    
    // Log the incoming request
    logStep('Payment status check request received', { 
      lowProfileCode, 
      sessionId,
      attempt, 
      operationType,
      timestamp
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

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Perform a duplicate check first to catch already processed payments that may not be reflected in sessions table
    logStep('Performing duplicate payment check');
    const { data: duplicateCheck, error: duplicateError } = await supabaseAdmin.rpc(
      'check_duplicate_payment_extended',
      { low_profile_id: lowProfileCode }
    );

    if (duplicateError) {
      logStep('Error checking for duplicates', { error: duplicateError.message });
    } else if (duplicateCheck?.exists) {
      logStep('Found duplicate payment', duplicateCheck);
      
      // If a duplicate exists, update the session and return success
      await supabaseAdmin
        .from('payment_sessions')
        .update({
          status: 'completed',
          transaction_id: duplicateCheck.transaction_id || duplicateCheck.token,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
        
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          processing: false,
          data: {
            transactionId: duplicateCheck.transaction_id || duplicateCheck.token,
            isTokenOperation: operationType === 'token_only'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the payment session
    logStep('Fetching payment session');
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      logStep('Error fetching payment session', { error: sessionError.message });
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

    logStep('Session data found', {
      status: sessionData.status,
      hasTransactionId: !!sessionData.transaction_id
    });

    // Check for expired session
    const isExpired = new Date(sessionData.expires_at) < new Date();
    if (isExpired) {
      logStep('Session expired');
      
      // Update session status if needed
      if (sessionData.status !== 'expired') {
        await supabaseAdmin
          .from('payment_sessions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', sessionId);
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment session expired",
          processing: false,
          failed: true,
          timeout: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check session states
    if (sessionData.status === 'completed' && sessionData.transaction_id) {
      logStep('Session marked as completed');
      const tokenOperation = operationType === 'token_only';
      
      return new Response(
        JSON.stringify({
          success: true,
          message: tokenOperation ? "Token created successfully" : "Payment completed successfully",
          processing: false,
          data: {
            transactionId: sessionData.transaction_id,
            isTokenOperation: tokenOperation,
            token: tokenOperation ? sessionData.transaction_id : null,
            // Include details needed by the frontend
            details: sessionData.transaction_data || {}
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sessionData.status === 'failed') {
      logStep('Session marked as failed');
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment failed",
          processing: false,
          failed: true,
          errorDetails: sessionData.transaction_data?.error || {}
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing payment in logs that might not be reflected in the session
    logStep('Checking payment logs');
    const { data: paymentLogs } = await supabaseAdmin
      .from('payment_logs')
      .select('*')
      .eq('token', lowProfileCode)
      .single();

    if (paymentLogs) {
      logStep('Found completed payment in logs', paymentLogs);
      
      await supabaseAdmin
        .from('payment_sessions')
        .update({
          status: 'completed',
          transaction_id: paymentLogs.transaction_id,
          transaction_data: paymentLogs.payment_data,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
        
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment completed (found in logs)",
          processing: false,
          data: {
            transactionId: paymentLogs.transaction_id,
            isTokenOperation: operationType === 'token_only',
            details: paymentLogs.payment_data || {}
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Special handling for token-only operations where we might have token data
    if (operationType === 'token_only' && sessionData.payment_method?.token) {
      logStep('Found token for token-only operation');
      await supabaseAdmin
        .from('payment_sessions')
        .update({
          status: 'completed',
          transaction_id: sessionData.payment_method.token,
          updated_at: new Date().toISOString()
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

    // Check subscription status for user if available
    if (sessionData.user_id) {
      logStep('Checking user subscriptions');
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', sessionData.user_id)
        .eq('plan_type', sessionData.plan_id)
        .eq('status', 'active')
        .maybeSingle();
        
      if (subscription) {
        logStep('Found active subscription', subscription);
        
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: 'completed',
            transaction_id: subscription.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
          
        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription is active",
            processing: false,
            data: {
              transactionId: subscription.id,
              isTokenOperation: operationType === 'token_only',
              subscriptionDetails: {
                plan: subscription.plan_type,
                startDate: subscription.created_at,
                nextChargeDate: subscription.next_charge_date
              }
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check for timeout based on attempt count
    if (attempt > 30) {
      logStep('Maximum attempts reached, timing out');
      
      // Update session status
      await supabaseAdmin
        .from('payment_sessions')
        .update({ 
          status: 'timeout', 
          updated_at: new Date().toISOString(),
          transaction_data: { 
            ...sessionData.transaction_data || {},
            timeoutAt: new Date().toISOString(),
            attemptCount: attempt
          }
        })
        .eq('id', sessionId);
      
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

    // If we reach here, the payment is still processing
    logStep('Payment still processing', { attempt });
    return new Response(
      JSON.stringify({
        success: false,
        message: "Payment is still processing",
        processing: true,
        attempt,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Unexpected error', { error: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Unknown error occurred",
        processing: false,
        error: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
