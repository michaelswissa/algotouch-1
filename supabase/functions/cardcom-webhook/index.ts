
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for cross-domain requests
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

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let paymentData;
    try {
      paymentData = await req.json();
    } catch (error) {
      console.error("[CARDCOM-WEBHOOK] Error parsing request body:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid JSON body' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log("[CARDCOM-WEBHOOK] Received webhook notification:", JSON.stringify(paymentData));
    
    // Extract key information
    const responseCode = paymentData.ResponseCode;
    const sessionId = paymentData.ReturnValue; // We stored the session ID in ReturnValue
    
    if (!sessionId) {
      console.error("[CARDCOM-WEBHOOK] Missing session ID in webhook data");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing session ID in webhook data' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update the payment session status based on the response code
    const status = responseCode === 0 ? 'completed' : 'failed';
    
    const { error: updateError } = await supabaseAdmin
      .from('payment_sessions')
      .update({
        status,
        transaction_id: paymentData.TranzactionId?.toString(),
        response_code: responseCode?.toString(),
        updated_at: new Date().toISOString(),
        payment_data: paymentData
      })
      .eq('id', sessionId);
    
    if (updateError) {
      console.error("[CARDCOM-WEBHOOK] Error updating payment session:", updateError);
      throw new Error(`Error updating payment session: ${updateError.message}`);
    }

    // If it was a successful payment and there's token info, save it
    if (responseCode === 0 && paymentData.TokenInfo) {
      const token = paymentData.TokenInfo.Token;
      const tokenExpDate = paymentData.TokenInfo.TokenExDate;
      
      if (token) {
        // Get the session data to find out which user and plan this is for
        const { data: sessionData } = await supabaseAdmin
          .from('payment_sessions')
          .select('user_id, plan_id, payment_details')
          .eq('id', sessionId)
          .single();
          
        if (sessionData && (sessionData.user_id || sessionData.payment_details?.email)) {
          // Save the token for future recurring payments
          await supabaseAdmin
            .from('recurring_payments')
            .insert({
              user_id: sessionData.user_id,
              token,
              token_expiry: tokenExpDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              plan_id: sessionData.plan_id,
              is_valid: true,
              status: 'active',
              card_details: {
                last4: paymentData.TranzactionInfo?.Last4CardDigits || '****',
                card_type: paymentData.TranzactionInfo?.CardInfo || 'Unknown',
                card_owner: paymentData.UIValues?.CardOwnerName || '',
                email: paymentData.UIValues?.CardOwnerEmail || sessionData.payment_details?.email || '',
                expiry_month: paymentData.TokenInfo?.CardMonth,
                expiry_year: paymentData.TokenInfo?.CardYear
              }
            });
            
          // If a subscription doesn't exist yet, create it
          const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('user_id', sessionData.user_id)
            .eq('plan_id', sessionData.plan_id)
            .maybeSingle();
            
          if (!existingSub) {
            // Determine subscription details based on plan
            let status = 'active';
            let trialEndDate = null;
            
            if (sessionData.plan_id === 'monthly') {
              status = 'trial';
              // Set trial end date to 30 days from now
              trialEndDate = new Date();
              trialEndDate.setDate(trialEndDate.getDate() + 30);
            }
            
            await supabaseAdmin
              .from('subscriptions')
              .insert({
                user_id: sessionData.user_id,
                plan_id: sessionData.plan_id,
                status,
                payment_method: 'credit_card',
                recurring_token: token,
                trial_end: trialEndDate ? trialEndDate.toISOString() : null,
                next_charge_at: trialEndDate ? trialEndDate.toISOString() : null
              });
          }
        }
      }
    }
    
    // Log the webhook event
    await supabaseAdmin
      .from('payment_logs')
      .insert({
        session_id: sessionId,
        event_type: 'webhook',
        status,
        data: paymentData
      });

    // Return success to CardCom
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error processing webhook';
    console.error(`[CARDCOM-WEBHOOK][ERROR] ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
