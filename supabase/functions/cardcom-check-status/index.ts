
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

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
    const { lowProfileId } = await req.json();
    
    if (!lowProfileId) {
      return new Response(
        JSON.stringify({ error: 'Missing lowProfileId parameter', success: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log('Checking payment status for lowProfileId:', lowProfileId);
    
    // First check if we already have a payment record
    const { data: paymentLog, error: paymentError } = await supabaseClient
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .maybeSingle();
    
    if (paymentError) {
      throw new Error(`Error fetching payment log: ${paymentError.message}`);
    }
    
    if (paymentLog && paymentLog.status === 'completed') {
      console.log('Payment already completed in our records', paymentLog);
      return new Response(
        JSON.stringify({
          ResponseCode: 0,
          Description: "Transaction completed successfully",
          TranzactionInfo: paymentLog.transaction_details,
          LowProfileId: lowProfileId,
          OperationResponse: "0"
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Get the payment session info
    const { data: session, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('payment_details->lowProfileId', lowProfileId)
      .maybeSingle();
    
    if (sessionError) {
      throw new Error(`Error fetching session: ${sessionError.message}`);
    }
    
    if (!session) {
      throw new Error('Payment session not found');
    }
    
    // Get Cardcom credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }

    // Call Cardcom API to get transaction status
    const queryParams = new URLSearchParams({
      terminalnumber: terminalNumber,
      username: apiName,
      lowprofilecode: lowProfileId
    });

    const cardcomUrl = `https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx?${queryParams}`;
    
    console.log('Querying Cardcom API:', cardcomUrl);
    
    const response = await fetch(cardcomUrl);
    
    if (!response.ok) {
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response from Cardcom
    const text = await response.text();
    
    // Try to parse as JSON first
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // If not JSON, it might be a form-encoded response
      // Parse the form-encoded response
      const formData = new URLSearchParams(text);
      data = Object.fromEntries(formData);
      
      // Convert string values to appropriate types
      if (data.ResponseCode) data.ResponseCode = parseInt(data.ResponseCode);
      if (data.OperationResponse) data.OperationResponse = data.OperationResponse.toString();
    }
    
    console.log('Received Cardcom API response:', data);
    
    // Check if transaction was successful
    const isSuccess = data.ResponseCode === 0 || data.OperationResponse === "0" || 
                     (data.TranzactionInfo && data.TranzactionInfo.ResponseCode === 0);
    
    if (isSuccess) {
      // Transaction was successful, update our records if not already updated by webhook
      if (!paymentLog) {
        console.log('Payment not yet recorded, saving transaction details');
        
        const transactionInfo = data.TranzactionInfo || {};
        
        await supabaseClient
          .from('user_payment_logs')
          .insert({
            user_id: session.user_id,
            token: lowProfileId,
            amount: session.payment_details?.amount || 0,
            status: 'completed',
            approval_code: transactionInfo.ApprovalNumber || '',
            transaction_details: transactionInfo
          });
          
        // Also process subscription update (simpler version than in webhook)
        const now = new Date();
        let currentPeriodEndsAt = null;
        
        if (session.plan_id === 'monthly') {
          // Create trial period
          const trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);
          currentPeriodEndsAt = new Date(trialEndsAt);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
          
          await supabaseClient
            .from('subscriptions')
            .upsert({
              user_id: session.user_id,
              plan_type: session.plan_id,
              status: 'trial',
              trial_ends_at: trialEndsAt.toISOString(),
              current_period_ends_at: currentPeriodEndsAt.toISOString(),
              contract_signed: true,
              contract_signed_at: now.toISOString()
            });
        } else if (session.plan_id === 'annual') {
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
          
          await supabaseClient
            .from('subscriptions')
            .upsert({
              user_id: session.user_id,
              plan_type: session.plan_id,
              status: 'active',
              current_period_ends_at: currentPeriodEndsAt.toISOString(),
              contract_signed: true,
              contract_signed_at: now.toISOString()
            });
            
          // Record payment for annual plan
          await supabaseClient
            .from('payment_history')
            .insert({
              user_id: session.user_id,
              subscription_id: session.user_id,
              amount: session.payment_details?.amount || 0,
              currency: 'ILS',
              status: 'completed'
            });
        } else if (session.plan_id === 'vip') {
          // VIP plan - lifetime access
          await supabaseClient
            .from('subscriptions')
            .upsert({
              user_id: session.user_id,
              plan_type: session.plan_id,
              status: 'active',
              contract_signed: true,
              contract_signed_at: now.toISOString()
            });
            
          // Record payment for VIP plan
          await supabaseClient
            .from('payment_history')
            .insert({
              user_id: session.user_id,
              subscription_id: session.user_id,
              amount: session.payment_details?.amount || 0,
              currency: 'ILS',
              status: 'completed'
            });
        }
      }
      
      // Update session status
      await supabaseClient
        .from('payment_sessions')
        .update({
          payment_details: {
            ...session.payment_details,
            status: 'completed',
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', session.id);
    }
    
    return new Response(
      JSON.stringify(data),
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
        status: 500,
      }
    );
  }
});
