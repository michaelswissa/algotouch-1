
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
    console.log('Received request to cardcom-openfields');
    
    const {
      planId,
      planName,
      amount: displayAmount, // This is the display amount in USD
      userEmail,
      userName,
      userId,
      isRegistration,
      registrationData
    } = await req.json();

    // Validate required fields
    if (!planId) {
      console.error('Missing required fields:', { planId });
      return new Response(
        JSON.stringify({ error: 'Missing required field: planId', success: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Creating payment session for plan:', planId);

    // Convert displayed USD price to ILS for charging
    let ilsAmount = 0;
    let operationType = "ChargeOnly"; // Default operation type

    // Set the actual ILS amount and operation type based on the plan
    if (planId === 'monthly') {
      ilsAmount = 0; // Free first month
      operationType = "ChargeAndCreateToken"; // Create token for future charges
    } else if (planId === 'annual') {
      ilsAmount = 3371; // 3,371 ILS immediate charge
      operationType = "ChargeAndCreateToken"; // Immediate charge and create token for future renewals
    } else if (planId === 'vip') {
      ilsAmount = 13121; // 13,121 ILS one-time payment
      operationType = "ChargeOnly"; // One-time charge, no token needed
    }

    console.log('Plan details:', { 
      planId, 
      ilsAmount,
      displayAmountUSD: displayAmount, 
      operationType 
    });

    // Get the Cardcom API credentials from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL") || "160138";
    const apiName = Deno.env.get("CARDCOM_USERNAME") || "bLaocQRMSnwphQRUVG3b";

    if (!terminalNumber || !apiName) {
      console.error('Missing Cardcom API credentials');
      return new Response(
        JSON.stringify({ error: 'Missing Cardcom API credentials', success: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

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
    
    // Build webhook URL and redirect URLs using the detected origin
    const successUrl = `${origin}/subscription?success=true&planId=${planId}`;
    const failureUrl = `${origin}/subscription?error=true`;
    
    // Use functions/cardcom-webhook endpoint as the webhook URL
    const webhookUrl = `${origin}/functions/cardcom-webhook`;
    
    console.log('URLs configured:', { successUrl, failureUrl, webhookUrl });

    // Pass the user ID via CustomFields for reference in the webhook
    const customFields = [
      {
        Id: 1,
        Value: userId || ""
      }
    ];

    // Create a Low Profile request to Cardcom
    const createLPRequest = {
      TerminalNumber: Number(terminalNumber),
      ApiName: apiName,
      Operation: operationType, // "ChargeOnly", "ChargeAndCreateToken", "CreateTokenOnly"
      Amount: ilsAmount, // This is the actual ILS amount to charge
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
            Description: getPlanDescription(planId), 
            Quantity: 1, 
            UnitCost: ilsAmount 
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
        CardOwnerNameValue: userName || "",
        CustomFields: customFields
      },
      AdvancedDefinition: {
        ThreeDSecureState: "Enabled" // Enable 3D Secure for added security
      }
    };
    
    console.log('Sending request to Cardcom API with params:', {
      TerminalNumber: createLPRequest.TerminalNumber,
      ApiName: createLPRequest.ApiName,
      Amount: createLPRequest.Amount,
      Operation: createLPRequest.Operation
    });
    
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
    console.log('Cardcom API response received:', JSON.stringify(cardcomResponse));
    
    if (cardcomResponse.ResponseCode !== 0) {
      console.error('Cardcom API returned error:', cardcomResponse.Description);
      throw new Error(`Cardcom error: ${cardcomResponse.Description}`);
    }
    
    // For OpenFields flow, we only need the LowProfileId
    return new Response(
      JSON.stringify({
        success: true,
        lowProfileId: cardcomResponse.LowProfileId,
        terminalNumber,
        apiName,
        planId,
        planName,
        amount: ilsAmount,
        displayAmount: displayAmount,
        currency: 'ILS',
        userEmail,
        userName,
        userId,
        operation: operationType
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
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to get Hebrew plan descriptions
function getPlanDescription(planId: string): string {
  switch (planId) {
    case 'monthly':
      return 'מנוי חודשי - חודש ניסיון חינם + 371 ש"ח חיוב חודשי';
    case 'annual':
      return 'מנוי שנתי - 3,371 ש"ח חיוב שנתי';
    case 'vip':
      return 'מנוי VIP - 13,121 ש"ח תשלום חד פעמי לכל החיים';
    default:
      return 'מנוי';
  }
}
