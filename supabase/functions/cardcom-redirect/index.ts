
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { logStep } from "../_shared/cardcom_utils.ts";

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
  
  // Only allow POST requests
  if (req.method !== 'POST') {
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
  }

  try {
    const functionName = 'cardcom-redirect';
    await logStep(functionName, "Function started");
    
    // Get request data
    const {
      planId,
      successUrl = '',
      errorUrl = '',
      webhookUrl = ''
    } = await req.json();
    
    await logStep(functionName, "Processing request for plan", { 
      planId, 
      successUrl, 
      errorUrl 
    });
    
    // Get request origin
    const requestOrigin = req.headers.get("Origin") || '';
    
    // Get CardCom URL parameters by calling the cardcom-payment function
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get default URLs for redirects
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || requestOrigin || "https://ndhakvhrrkczgylcmyoc.supabase.co";
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || `${supabaseUrl}/functions/v1`;
    
    const defaultSuccessUrl = `${frontendBaseUrl}/subscription/success`;
    const defaultErrorUrl = `${frontendBaseUrl}/subscription/failed`;
    const defaultWebhookUrl = `${publicFunctionsUrl}/cardcom-webhook`;
    
    // Use provided URLs or defaults
    const finalSuccessUrl = successUrl || defaultSuccessUrl;
    const finalErrorUrl = errorUrl || defaultErrorUrl;
    const finalWebhookUrl = webhookUrl || defaultWebhookUrl;
    
    await logStep(functionName, "URLs", { 
      success: finalSuccessUrl, 
      error: finalErrorUrl, 
      indicator: finalWebhookUrl 
    });
    
    // Call the cardcom-payment function to get payment details
    const response = await fetch(`${supabaseUrl}/functions/v1/cardcom-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        planId,
        successUrl: finalSuccessUrl,
        errorUrl: finalErrorUrl,
        webhookUrl: finalWebhookUrl
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to initialize payment: ${error}`);
    }
    
    const paymentData = await response.json();
    
    if (!paymentData.success) {
      throw new Error(paymentData.message || "Failed to initialize payment");
    }
    
    // Get redirect URL from the payment response
    const redirectUrl = paymentData.data.iframeUrl || paymentData.data.redirectUrl || paymentData.data.url;
    
    if (!redirectUrl) {
      throw new Error("No redirect URL found in payment response");
    }
    
    // Return success response with redirect URL
    return new Response(
      JSON.stringify({
        success: true,
        message: "Redirect URL generated successfully",
        data: {
          redirectUrl,
          sessionId: paymentData.data.sessionId,
          lowProfileId: paymentData.data.lowProfileId,
          reference: paymentData.data.reference
        }
      }),
      { 
        status: 200, 
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
