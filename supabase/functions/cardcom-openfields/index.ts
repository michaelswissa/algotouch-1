
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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
    // Parse request body
    const userData = await req.json();
    
    // Extract payment details
    const { 
      planId, 
      amount, 
      userId, 
      userName = '', 
      email, 
      userEmail,
      registrationData,
      isRecurring = true,
      freeTrialDays = 0
    } = userData;
    
    // Validate required fields
    if (!planId || !email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: planId and email are required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Generate session ID for the payment
    const sessionId = crypto.randomUUID();
    
    // Generate expires_at timestamp (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Create payment session record
    const { data: paymentSession, error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .insert({
        id: sessionId,
        user_id: userId || null,
        plan_id: planId,
        email: email || userEmail,
        payment_details: {
          amount,
          planId,
          userName,
          registrationData
        },
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('Error creating payment session:', sessionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create payment session' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    console.log('Created payment session:', sessionId);
    
    // Create Cardcom Low Profile session
    const cardcomApiUrl = 'https://secure.cardcom.solutions/api/v11/LowProfile/Create';
    
    // Determine product name based on plan
    let productName = '';
    let planPrice = 0;
    
    switch(planId) {
      case 'monthly':
        productName = 'מנוי חודשי';
        planPrice = 371;
        break;
      case 'annual':
        productName = 'מנוי שנתי';
        planPrice = 3371;
        break;
      case 'vip':
        productName = 'מנוי VIP לכל החיים';
        planPrice = 13121;
        break;
      default:
        productName = 'מנוי';
        planPrice = amount || 0;
    }
    
    // Get origin for redirect URLs
    const origin = req.headers.get('origin') || 'https://app.funtrading.co.il';
    
    // Determine if this is a trial offering
    const paymentOperation = "ChargeOnly";
    
    // Prepare Cardcom request body
    const cardcomBody = {
      TerminalNumber: parseInt(Deno.env.get('CARDCOM_TERMINAL_NUMBER') || '0'),
      ApiName: Deno.env.get('CARDCOM_API_NAME'),
      Amount: planPrice,
      CoinId: 1, // ILS
      Language: 'he',
      Operation: paymentOperation,
      ProductName: productName,
      ReturnValue: sessionId, // Use our session ID to match the payment later
      SuccessRedirectUrl: `${origin}/my-subscription?success=true&paymentId=${sessionId}`,
      FailedRedirectUrl: `${origin}/subscription?error=true&paymentId=${sessionId}`,
      WebHookUrl: `${origin}/api/cardcom-webhook`,
      Document: {
        Name: userName || email || "לקוח",
        Email: email,
        Language: 'he',
        Products: [
          {
            Description: productName,
            Quantity: 1,
            UnitCost: planPrice
          }
        ],
        IsShowOnlyDocument: false,
        IsAllowEditDocument: false
      },
      UIDefinition: {
        IsHideCVV: false,
        IsHideCardOwnerName: false,
        CardOwnerNameValue: userName || "",
        CardOwnerEmailValue: email || ""
      },
      AdvancedDefinition: {
        IsAVSEnable: false,
        MinNumOfPayments: 1,
        MaxNumOfPayments: 1
      }
    };
    
    console.log('Creating Cardcom payment session');
    
    // Make request to Cardcom API
    const cardcomResponse = await fetch(cardcomApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardcomBody)
    });
    
    if (!cardcomResponse.ok) {
      const errorText = await cardcomResponse.text();
      console.error('Cardcom API error:', errorText);
      
      throw new Error(`Cardcom API returned ${cardcomResponse.status}: ${errorText}`);
    }
    
    const cardcomData = await cardcomResponse.json();
    
    // Validate Cardcom response
    if (cardcomData.ResponseCode !== 0) {
      console.error('Cardcom error:', cardcomData);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: cardcomData.Description || 'Failed to create Cardcom payment session'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    console.log('Successfully created Cardcom payment session:', cardcomData.LowProfileId);
    
    // Update payment session with Cardcom data
    await supabaseClient
      .from('payment_sessions')
      .update({
        payment_details: {
          ...paymentSession.payment_details,
          lowProfileId: cardcomData.LowProfileId,
          url: cardcomData.Url,
          status: 'pending'
        }
      })
      .eq('id', sessionId);
    
    // Return success with payment info
    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        lowProfileId: cardcomData.LowProfileId,
        url: cardcomData.Url,
        bitUrl: cardcomData.UrlToBit,
        paypalUrl: cardcomData.UrlToPayPal
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating payment session:', error);
    
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
