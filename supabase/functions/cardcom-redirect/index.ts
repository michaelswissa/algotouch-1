
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers to ensure the API can be called from the frontend
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
    
    // Get CardCom configuration
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error("Missing CardCom API configuration");
    }

    // Check what kind of request this is (based on HTTP method)
    if (req.method === 'GET') {
      // Extract payment session ID from URL query parameters 
      const url = new URL(req.url);
      const sessionId = url.searchParams.get('session_id');
      const planId = url.searchParams.get('plan_id');
      const action = url.searchParams.get('action') || 'process';
      
      if (!sessionId && !planId) {
        throw new Error("Missing required query parameters");
      }

      console.log(`[CARDCOM-REDIRECT] Processing ${action} request`, { sessionId, planId });
      
      // If this is a "process" request, create a payment session and redirect to CardCom
      if (action === 'process' && planId) {
        const { data: plan, error: planError } = await supabaseAdmin
          .from('plans')
          .select('*')
          .eq('id', planId)
          .maybeSingle();
          
        if (planError || !plan) {
          throw new Error(`Invalid plan ID: ${planId}`);
        }
        
        // Determine operation type and amount based on plan
        let operationType = "1"; // Default to ChargeOnly
        let amount = 0;
        
        switch (planId) {
          case 'monthly':
            operationType = "3"; // CreateTokenOnly 
            amount = 0; // Free trial
            break;
          case 'annual':
            operationType = "2"; // ChargeAndCreateToken
            amount = plan.price || 0;
            break;
          case 'vip':
            operationType = "1"; // ChargeOnly
            amount = plan.price || 0;
            break;
        }

        // Create transaction reference
        const transactionRef = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Generate lowProfileId
        const lowProfileId = crypto.randomUUID();
        
        // Prepare base URL and host for webhook 
        const host = url.hostname.includes('localhost') ? 
          'https://algotouch.lovable.app' : // Use production host when testing locally
          `${url.protocol}//${url.host}`;
        
        // Create success and error redirect URLs
        const successUrl = `${host}/payment/success?session_id=${lowProfileId}`;
        const errorUrl = `${host}/payment/error?session_id=${lowProfileId}`;
        
        // Create webhook URL (need to be accessible from CardCom)
        const webhookUrl = `${host}/api/cardcom-webhook?session_id=${lowProfileId}`;
        
        console.log('[CARDCOM-REDIRECT] Creating payment session with URLs:', {
          successUrl,
          errorUrl,
          webhookUrl
        });
        
        // Create payment session record
        const { data: sessionData, error: sessionError } = await supabaseAdmin
          .from('payment_sessions')
          .insert({
            plan_id: planId,
            amount: amount,
            currency: "ILS",
            status: 'initiated',
            operation_type: operationType,
            reference: transactionRef, 
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            payment_details: {
              planType: planId,
              isRedirect: true
            },
            low_profile_id: lowProfileId
          })
          .select('id')
          .single();
          
        if (sessionError) {
          console.error("Database insert error:", sessionError);
          throw new Error("Failed to create payment session");
        }
        
        console.log('[CARDCOM-REDIRECT] Payment session created:', {
          sessionId: sessionData.id,
          lowProfileId
        });
        
        // Build the CardCom redirect URL
        const cardcomUrl = "https://secure.cardcom.solutions";
        const redirectUrl = `${cardcomUrl}/Interface/LowProfile.aspx` + 
          `?TerminalNumber=${terminalNumber}` +
          `&LowProfileCode=${lowProfileId}` +
          `&SumToBill=${amount}` + 
          `&CoinID=1` +  // ILS
          `&Language=he` +
          `&APILevel=10` +
          `&Operation=${operationType}` +
          `&ReturnValue=${encodeURIComponent(sessionData.id)}` +
          `&SuccessRedirectUrl=${encodeURIComponent(successUrl)}` + 
          `&ErrorRedirectUrl=${encodeURIComponent(errorUrl)}` +
          `&IndicatorUrl=${encodeURIComponent(webhookUrl)}`;
        
        console.log('[CARDCOM-REDIRECT] Redirecting to CardCom URL:', redirectUrl);
        
        // Redirect to CardCom payment page
        return Response.redirect(redirectUrl, 302);
      }
      
      // If this is a success/error callback, handle accordingly
      if (action === 'success' || action === 'error') {
        // Lookup the payment session
        const { data: paymentSession, error: sessionError } = await supabaseAdmin
          .from('payment_sessions')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();
        
        if (sessionError || !paymentSession) {
          throw new Error(`Invalid session ID or session not found: ${sessionId}`);
        }
        
        // Update payment session status if needed
        if (action === 'success' && paymentSession.status !== 'completed') {
          await supabaseAdmin
            .from('payment_sessions')
            .update({ status: 'completed' })
            .eq('id', sessionId);
        } else if (action === 'error' && paymentSession.status !== 'failed') {
          await supabaseAdmin
            .from('payment_sessions')
            .update({ status: 'failed' })
            .eq('id', sessionId);
        }
        
        // Redirect to appropriate page
        const redirectPath = action === 'success' ? '/subscription/success' : '/subscription/failed';
        const redirectUrl = `${url.protocol}//${url.host}${redirectPath}?session_id=${sessionId}`;
        
        return Response.redirect(redirectUrl, 302);
      }
      
      // If not a recognized action, return an error
      throw new Error(`Unrecognized action: ${action}`);
    }
    
    // For API usage (POST requests), create a redirect URL
    if (req.method === 'POST') {
      // Parse request body
      const { planId, successUrl, errorUrl, webhookUrl } = await req.json();
      
      if (!planId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Missing required parameters' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Get plan details
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
        
      if (planError || !plan) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Invalid plan ID: ${planId}` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Determine operation type and amount based on plan
      let operationType = "1"; // Default to ChargeOnly
      let amount = 0;
      
      switch (planId) {
        case 'monthly':
          operationType = "3"; // CreateTokenOnly
          amount = 0; // Free trial
          break;
        case 'annual':
          operationType = "2"; // ChargeAndCreateToken
          amount = plan.price || 0;
          break;
        case 'vip':
          operationType = "1"; // ChargeOnly
          amount = plan.price || 0;
          break;
        default:
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Unsupported plan type: ${planId}` 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
      }
      
      // Create transaction reference
      const transactionRef = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate lowProfileId
      const lowProfileId = crypto.randomUUID();
      
      // Create payment session record
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .insert({
          plan_id: planId,
          amount: amount,
          currency: "ILS",
          status: 'initiated',
          operation_type: operationType,
          reference: transactionRef,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          payment_details: {
            planType: planId,
            isRedirect: true
          },
          low_profile_id: lowProfileId
        })
        .select('id')
        .single();
        
      if (sessionError) {
        console.error("Database insert error:", sessionError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to create payment session" 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Determine success and error URLs
      const defaultSuccessUrl = new URL(req.url);
      defaultSuccessUrl.searchParams.set("action", "success");
      defaultSuccessUrl.searchParams.set("session_id", sessionData.id);
      
      const defaultErrorUrl = new URL(req.url);
      defaultErrorUrl.searchParams.set("action", "error");
      defaultErrorUrl.searchParams.set("session_id", sessionData.id);
      
      const defaultWebhookUrl = new URL(req.url);
      defaultWebhookUrl.pathname = "/api/cardcom-webhook";
      defaultWebhookUrl.searchParams.set("session_id", sessionData.id);
      
      // Build the CardCom redirect URL
      const cardcomUrl = "https://secure.cardcom.solutions";
      const redirectUrl = `${cardcomUrl}/Interface/LowProfile.aspx` + 
        `?TerminalNumber=${terminalNumber}` +
        `&LowProfileCode=${lowProfileId}` +
        `&SumToBill=${amount}` + 
        `&CoinID=1` +  // ILS
        `&Language=he` +
        `&APILevel=10` +
        `&Operation=${operationType}` +
        `&ReturnValue=${encodeURIComponent(sessionData.id)}` +
        `&SuccessRedirectUrl=${encodeURIComponent(successUrl || defaultSuccessUrl.toString())}` + 
        `&ErrorRedirectUrl=${encodeURIComponent(errorUrl || defaultErrorUrl.toString())}` +
        `&IndicatorUrl=${encodeURIComponent(webhookUrl || defaultWebhookUrl.toString())}`;
      
      // Return the redirect URL and session info
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment session created",
          data: {
            redirectUrl,
            sessionId: sessionData.id,
            lowProfileId,
            reference: transactionRef
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // If method is neither GET nor POST
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[CARDCOM-REDIRECT][ERROR] ${errorMessage}`);
    
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
