
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  try {
    console.log("Payment status check request received");
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }
    
    const { lowProfileId, planId } = await req.json();
    
    if (!lowProfileId) {
      throw new Error('Missing lowProfileId parameter');
    }
    
    console.log(`Checking payment status for: ${lowProfileId}, plan: ${planId || 'unknown'}`);
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get payment logs for this transaction
    const { data: paymentLog, error: logError } = await supabaseClient
      .from('payment_logs')
      .select('*')
      .eq('lowprofile_id', lowProfileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (logError) {
      console.log(`No payment log found, checking with Cardcom API directly`);
    } else if (paymentLog) {
      console.log(`Found payment log: ${paymentLog.status}`);
      
      // If we have a completed payment log, return success
      if (paymentLog.status === 'completed') {
        return new Response(
          JSON.stringify({ 
            ResponseCode: 0,
            OperationResponse: '0',
            Description: 'Payment already completed',
            paymentLog
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }
    
    // Get Cardcom API credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    // Check payment status with Cardcom API
    const url = new URL('https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx');
    url.searchParams.append('terminalnumber', terminalNumber);
    url.searchParams.append('username', apiName);
    url.searchParams.append('lowprofilecode', lowProfileId);
    url.searchParams.append('codepage', '65001');
    
    console.log(`Checking with Cardcom API: ${url.toString()}`);
    
    const cardcomResponse = await fetch(url.toString());
    const responseText = await cardcomResponse.text();
    
    console.log(`Cardcom API raw response: ${responseText}`);
    
    // Parse the response
    let responseData;
    try {
      // Try parsing as JSON first
      responseData = JSON.parse(responseText);
    } catch (jsonError) {
      console.log("Not JSON, parsing URL parameters");
      
      try {
        // Parse as URL parameters
        const params = new URLSearchParams(responseText);
        responseData = {};
        
        for (const [key, value] of params.entries()) {
          responseData[key] = value;
        }
      } catch (paramError) {
        console.error("Error parsing response:", paramError);
        throw new Error(`Failed to parse Cardcom response: ${responseText}`);
      }
    }
    
    // Store the response in payment_logs
    if (responseData) {
      await supabaseClient
        .from('payment_logs')
        .insert({
          lowprofile_id: lowProfileId,
          status: responseData.OperationResponse === '0' ? 'completed' : 'pending',
          plan_id: planId || undefined,
          payment_data: responseData,
          transaction_id: responseData.InternalDealNumber
        })
        .catch(error => console.error('Error logging payment check:', error));
    }
    
    // Update subscription if payment is successful
    if (responseData && responseData.OperationResponse === '0') {
      // Get user_id from payment_sessions
      const { data: session } = await supabaseClient
        .from('payment_sessions')
        .select('user_id, email')
        .eq('id', lowProfileId)
        .single();
      
      if (session?.user_id) {
        // Process successful payment (simplified version of what's in the webhook)
        const now = new Date();
        let trialEndsAt = null;
        let currentPeriodEndsAt = null;
        
        if (planId === 'monthly') {
          trialEndsAt = new Date(now);
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);
          
          currentPeriodEndsAt = new Date(trialEndsAt);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
        } else if (planId === 'annual') {
          currentPeriodEndsAt = new Date(now);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
        }
        
        // Update subscription
        await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: session.user_id,
            plan_type: planId || 'monthly',
            status: planId === 'monthly' ? 'trial' : 'active',
            trial_ends_at: trialEndsAt?.toISOString() || null,
            current_period_ends_at: currentPeriodEndsAt?.toISOString() || null,
            payment_method: {
              lastFourDigits: responseData.CardNumber5,
              token: responseData.Token
            },
            contract_signed: true,
            contract_signed_at: now.toISOString()
          }, {
            onConflict: 'user_id'
          })
          .catch(error => console.error('Error updating subscription:', error));
      }
    }
    
    // Return the response
    return new Response(
      JSON.stringify({ ...responseData, paymentLog }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Payment status check error:', error);
    
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
