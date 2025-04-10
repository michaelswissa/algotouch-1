
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const {
      planId,
      planName,
      amount,
      userEmail,
      userName,
      isRegistration,
      registrationData
    } = await req.json();

    // Validate required fields
    if (!planId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: planId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Creating payment session for plan:', planId);

    // Get the Cardcom API credentials from environment variables or hardcoded values
    const terminalNumber = "160138";  // Hard-coded from provided details
    const apiName = "bLaocQRMSnwphQRUVG3b";  // Hard-coded from provided details

    // If this is a registration payment, store the registration data temporarily
    if (isRegistration && registrationData) {
      console.log('Processing registration data for new user');
      
      // Initialize Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      
      // Create an expiry date (30 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);
      
      // Store registration data in a temporary table
      const { error } = await supabaseClient
        .from('temp_registration_data')
        .insert({
          registration_data: registrationData,
          expires_at: expiresAt.toISOString(),
          used: false
        });
      
      if (error) {
        console.error('Error storing temporary registration data:', error);
      }
    }

    // Create request URL for dynamic origin detection
    const requestUrl = new URL(req.url);
    const origin = requestUrl.origin.includes('localhost') || requestUrl.origin.includes('127.0.0.1') 
      ? 'http://localhost:3000' 
      : requestUrl.origin;
    
    const successUrl = `${origin}/subscription?success=true`;
    const failureUrl = `${origin}/subscription?error=true`;
    const webhookUrl = `${origin}/functions/cardcom-webhook`;

    // Create a Low Profile request to Cardcom
    const createLPRequest = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      Operation: "ChargeOnly", // Default operation
      Amount: amount,
      ReturnValue: planId, // Store plan ID for reference
      SuccessRedirectUrl: successUrl,
      FailedRedirectUrl: failureUrl,
      WebHookUrl: webhookUrl,
      ProductName: planName || 'Subscription Plan',
      Language: 'he',
      ISOCoinId: 1, // ILS
      Document: {
        Name: userName || "User",
        Email: userEmail || "",
        Products: [
          { 
            Description: planName || "Subscription Plan", 
            Quantity: 1, 
            UnitCost: amount 
          }
        ],
        IsAllowEditDocument: false,
        IsShowOnlyDocument: false,
        Language: 'he'
      },
      UIDefinition: {
        IsHideCVV: false,
        IsHideCardOwnerName: false,
        IsHideCardOwnerPhone: false,
        IsCardOwnerPhoneRequired: true,
        IsHideCardOwnerEmail: false,
        IsCardOwnerEmailRequired: true,
        CardOwnerEmailValue: userEmail || "",
        CardOwnerNameValue: userName || ""
      },
      AdvancedDefinition: {
        ThreeDSecureState: "Enabled" // Enable 3D Secure for added security
      }
    };
    
    console.log('Sending request to Cardcom API');
    
    // Call Cardcom API to create a Low Profile payment page
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createLPRequest),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cardcom API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
    }
    
    const cardcomResponse = await response.json();
    console.log('Cardcom response received:', JSON.stringify(cardcomResponse));
    
    if (cardcomResponse.ResponseCode !== 0) {
      throw new Error(`Cardcom error: ${cardcomResponse.Description}`);
    }
    
    // Return success with necessary data for frontend
    return new Response(
      JSON.stringify({
        success: true,
        terminalNumber,
        apiUsername: apiName,
        lowProfileId: cardcomResponse.LowProfileId,
        url: cardcomResponse.Url,
        planId,
        planName,
        amount,
        userEmail,
        userName,
        webhookUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
