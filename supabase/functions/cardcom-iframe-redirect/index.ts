
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

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

// CardCom API configuration
const API_CONFIG = {
  TERMINAL: Deno.env.get('CARDCOM_TERMINAL'),
  USERNAME: Deno.env.get('CARDCOM_USERNAME'),
  API_PASSWORD: Deno.env.get('CARDCOM_API_PASSWORD'),
  BASE_URL: 'https://secure.cardcom.solutions/api/v11',
};

// Helper function to log steps with timestamps
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] ${step}${detailsStr}`);
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Parse request body
    const { 
      amount, 
      userId, 
      email, 
      fullName = "",
      phone = "",
      operation = "ChargeOnly",
      planId = "monthly",
      returnValue // Explicit parameter for user ID as return value
    } = await req.json();

    // CRITICAL: Always ensure we have a userId/returnValue for linking payment to user
    // If returnValue is not explicitly provided, use userId
    const userIdentifier = returnValue || userId;
    
    if (!userIdentifier) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required user identifier. Please provide userId or returnValue."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required amount parameter."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate required configuration
    if (!API_CONFIG.TERMINAL || !API_CONFIG.USERNAME) {
      throw new Error('Missing CardCom configuration. Please check environment variables.');
    }

    // Create unique session ID for this payment attempt
    const sessionId = crypto.randomUUID();

    // Generate success and error redirect URLs
    const baseUrl = req.headers.get('origin') || 'http://localhost:3000';
    const successRedirectUrl = `${baseUrl}/cardcom-redirect`;
    const errorRedirectUrl = `${baseUrl}/cardcom-redirect`;

    // Generate webhook URL - this should be your publicly accessible webhook endpoint
    const webHookUrl = Deno.env.get('FRONTEND_URL') 
      ? `${Deno.env.get('FRONTEND_URL')}/functions/v1/cardcom-webhook`
      : null;

    // Prepare the request payload for LowProfile Create
    const payload = {
      TerminalNumber: parseInt(API_CONFIG.TERMINAL),
      ApiName: API_CONFIG.USERNAME,
      ReturnValue: userIdentifier, // CRITICAL: Always pass the user ID for webhook identification
      Amount: amount,
      SuccessRedirectUrl: successRedirectUrl,
      FailedRedirectUrl: errorRedirectUrl,
      WebHookUrl: webHookUrl,
      Operation: operation,
      Language: "he",
      ISOCoinId: 1, // ILS
      
      // Product info based on plan
      ProductName: planId === 'monthly' ? 'מנוי חודשי' : 'מנוי שנתי',
      
      // UI settings for collecting customer info
      UIDefinition: {
        CardOwnerName: fullName || "",
        CardOwnerEmail: email || "",
        CardOwnerPhone: phone || "",
        IsHideCardOwnerPhone: !!phone,
        IsHideCardOwnerEmail: !!email,
        IsHideCardOwnerName: !!fullName
      }
    };

    logStep("Creating CardCom payment session", { 
      amount, 
      userId: userIdentifier, 
      planId,
      webhookConfigured: !!webHookUrl,
      operation
    });

    // Make the API request
    const response = await fetch(`${API_CONFIG.BASE_URL}/LowProfile/Create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CardCom API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    if (result.ResponseCode !== 0) {
      throw new Error(`CardCom error: ${result.Description || 'Unknown error'}`);
    }

    // Store payment session details for later verification
    const { data: sessionData, error: sessionError } = await supabase
      .from('payment_sessions')
      .insert({
        id: sessionId,
        user_id: userIdentifier,
        low_profile_id: result.LowProfileId,
        amount,
        plan_id: planId,
        status: 'initiated',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        payment_details: {
          email,
          fullName,
          phone,
          operation,
          webhookUrl: webHookUrl
        },
        reference: result.LowProfileId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      logStep("Error storing payment session", { error: sessionError });
      // Continue even if session storage fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: result.Url,
        lowProfileId: result.LowProfileId,
        sessionId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error creating payment session:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
