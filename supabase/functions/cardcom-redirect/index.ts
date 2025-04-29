
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
    // Get CardCom configuration from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error("Missing CardCom API configuration");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { 
      planId,
      successUrl = '',
      errorUrl = '',
      webhookUrl = ''
    } = await req.json();
    
    console.log(`[CARDCOM-REDIRECT] Processing request for plan: ${planId}, successUrl: ${successUrl}, errorUrl: ${errorUrl}`);

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
    
    // Get plan information
    let amount = 0;
    let operationType = "1"; // Default: ChargeOnly
    
    // Determine operation type and amount based on plan
    if (planId) {
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
        
      if (planError) {
        throw new Error("Error fetching plan details");
      }
      
      if (!plan) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }
      
      // Set operation type and amount based on plan type
      switch (planId) {
        case 'monthly':
          // Monthly plan starts with free trial (amount=0)
          operationType = "3"; // CreateTokenOnly
          amount = 0; 
          break;
        case 'annual':
          // Annual plan charges immediately full amount
          operationType = "2"; // ChargeAndCreateToken
          amount = plan.price || 0;
          break;
        case 'vip':
          // VIP plan is one-time payment
          operationType = "1"; // ChargeOnly
          amount = plan.price || 0;
          break;
        default:
          operationType = "1"; // Default to ChargeOnly
          amount = plan.price || 0;
      }
    }

    // Generate a unique session ID and LowProfile ID
    const sessionId = crypto.randomUUID();
    const lowProfileId = crypto.randomUUID();
    const reference = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create clean URLs (removing any double slashes except in http://)
    const successRedirectUrl = successUrl || `${req.url.split('/api/')[0]}/payment/success`;
    const errorRedirectUrl = errorUrl || `${req.url.split('/api/')[0]}/payment/error`;
    const indicatorUrl = webhookUrl || `${req.url.split('/api/')[0]}/api/cardcom-webhook`;
    
    console.log(`[CARDCOM-REDIRECT] URLs - success: ${successRedirectUrl}, error: ${errorRedirectUrl}, indicator: ${indicatorUrl}`);

    // Store the payment session in the database
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: null, // Anonymous initially
        plan_id: planId,
        amount: amount,
        currency: "ILS",
        status: 'initiated',
        operation_type: operationType,
        low_profile_id: lowProfileId,
        reference: reference,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payment_details: { 
          planType: planId
        }
      })
      .select('id')
      .single();
      
    if (sessionError) {
      console.error("Database error:", sessionError);
      throw new Error("Failed to create payment session");
    }

    // Build the CardCom LowProfile URL
    const cardcomUrl = "https://secure.cardcom.solutions";
    const productName = planId === 'monthly' ? 'מנוי חודשי' : 
                        planId === 'annual' ? 'מנוי שנתי' : 
                        'מנוי VIP';
    
    const redirectUrl = `${cardcomUrl}/Interface/LowProfile.aspx?TerminalNumber=${terminalNumber}&Operation=${operationType === '3' ? 3 : operationType === '2' ? 2 : 1}&SumToBill=${amount}&CoinId=1&Language=he&ProductName=${encodeURIComponent(productName)}&APILevel=10&SuccessRedirectUrl=${encodeURIComponent(successRedirectUrl)}&ErrorRedirectUrl=${encodeURIComponent(errorRedirectUrl)}&IndicatorUrl=${encodeURIComponent(indicatorUrl)}&ReturnValue=${encodeURIComponent(sessionId + '|' + lowProfileId)}`;

    console.log(`[CARDCOM-REDIRECT] Created session with ID: ${sessionData.id}, lowProfileId: ${lowProfileId}`);

    // Return the result
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment redirect URL generated successfully",
        data: {
          redirectUrl,
          sessionId: sessionData.id,
          lowProfileId
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error creating redirect URL';
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
