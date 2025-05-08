
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to log steps with timestamps
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] ${step}${detailsStr}`);
}

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
  
  const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://algotouch.co.il';
  const CARDCOM_TERMINAL = Deno.env.get('CARDCOM_TERMINAL_NUMBER');
  const CARDCOM_API_NAME = Deno.env.get('CARDCOM_API_NAME');

  if (!CARDCOM_TERMINAL || !CARDCOM_API_NAME) {
    return new Response(
      JSON.stringify({ error: "Missing Cardcom configuration" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  try {
    // Get the request body
    const body = await req.json();
    const {
      amount = 1,
      userId,
      email,
      fullName,
      phone,
      idNumber,
      operation = "ChargeOnly", // Default operation
      planId = "monthly" // Default plan
    } = body;

    logStep("Creating CardCom payment session with terminal: " + CARDCOM_TERMINAL + ", operation: " + operation + ", amount: " + amount);

    // Prepare user details for the request
    const userDetails = {
      name: fullName || "",
      email: email || "",
      phone: phone || "",
      idNumber: idNumber || "",
      operation,
      amount
    };
    
    logStep("Sending payload with user details:", userDetails);

    // Create a Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Base URL for CardCom API
    const cardcomApiUrl = "https://secure.cardcom.solutions/Interface/LowProfile.aspx";

    // Generate success and error redirect URLs
    const successRedirectUrl = `${FRONTEND_URL}/cardcom-redirect`; // The dedicated redirect page
    const failedRedirectUrl = `${FRONTEND_URL}/cardcom-redirect?error=true`;
    
    // Set a webhook URL for asynchronous notifications
    const webHookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook`;

    // Create a unique ID for the payment session
    const paymentSessionId = crypto.randomUUID();
    
    // Store payment session in Supabase
    if (userId) {
      await supabaseAdmin.from('payment_sessions').insert({
        id: paymentSessionId,
        user_id: userId,
        plan_id: planId,
        amount,
        status: 'initiated',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes expiry
        payment_details: {
          operation,
          email,
          fullName
        }
      });
    }

    // Create the request payload for CardCom
    const payload = {
      TerminalNumber: CARDCOM_TERMINAL,
      ApiName: CARDCOM_API_NAME,
      Amount: amount,
      Operation: operation,
      ProductName: `Subscription - ${planId}`,
      ReturnValue: userId || "", // Important: We'll use this to identify the user in the webhook
      SuccessRedirectUrl: successRedirectUrl,
      FailedRedirectUrl: failedRedirectUrl,
      WebHookUrl: webHookUrl,
      Language: "he",
      UIDefinition: {
        IsHideCardOwnerName: false,
        CardOwnerNameValue: fullName || "",
        IsHideCardOwnerEmail: false,
        CardOwnerEmailValue: email || "",
        IsHideCardOwnerPhone: false,
        CardOwnerPhoneValue: phone || "",
        IsHideCardOwnerIdentityNumber: false
      }
    };

    // Make the API request to CardCom
    const response = await fetch(cardcomApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CardCom API error: ${response.status} ${errorText}`);
    }

    const cardcomResponse = await response.json();

    if (cardcomResponse.ResponseCode !== 0) {
      throw new Error(`CardCom error: ${cardcomResponse.Description}`);
    }

    logStep("Created CardCom payment session: " + cardcomResponse.LowProfileId);

    // Update the payment session with the CardCom low profile ID
    if (userId) {
      await supabaseAdmin.from('payment_sessions').update({
        low_profile_id: cardcomResponse.LowProfileId
      }).eq('id', paymentSessionId);
    }

    // Return the payment URL to the client
    return new Response(
      JSON.stringify({ 
        url: cardcomResponse.Url, 
        lowProfileId: cardcomResponse.LowProfileId,
        sessionId: paymentSessionId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error creating payment session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
