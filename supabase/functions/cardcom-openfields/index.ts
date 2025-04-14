
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

function generateRandomId() {
  return crypto.randomUUID();
}

// Helper function to validate required fields
function validateRequiredParams(data: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!data[field]) {
      return `Missing required parameter: ${field}`;
    }
  }
  return null;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const requestBody = await req.json();
    const { 
      planId, 
      planName, 
      amount, 
      userId, 
      userName, 
      email, 
      userEmail, // Accept both email and userEmail for backward compatibility
      isRecurring, 
      freeTrialDays,
      registrationData, // Registration data for non-authenticated users
      successRedirectUrl,
      errorRedirectUrl
    } = requestBody;
    
    // Validate required parameters
    const requiredParams = ['planId', 'amount'];
    const validationError = validateRequiredParams(requestBody, requiredParams);
    if (validationError) {
      throw new Error(validationError);
    }
    
    // Use either email or userEmail (prefer userEmail if both exist)
    const effectiveEmail = userEmail || email;
    
    // Email is required
    if (!effectiveEmail) {
      throw new Error('Missing required parameter: userEmail');
    }

    console.log('Creating payment session for:', { 
      planId, 
      userId, 
      userEmail: effectiveEmail, 
      userName, 
      hasRegistrationData: !!registrationData,
      amount
    });
    
    // Get Cardcom credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL");
    const apiName = Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME");
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing Cardcom API credentials in environment variables');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate expiration time (30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // Generate a unique session ID
    const sessionId = generateRandomId();
    
    // Generate a unique lowProfileId for Cardcom
    const lowProfileId = generateRandomId();

    // Determine operation based on plan
    let operation = "1"; // Default: ChargeOnly
    if (isRecurring) {
      operation = freeTrialDays > 0 ? "3" : "2"; // CreateTokenOnly or ChargeAndCreateToken
    }

    // Payment details including registration data if present
    const paymentDetails = {
      lowProfileId,
      amount,
      planName,
      planId,
      userName,
      userEmail: effectiveEmail,
      operation,
      status: 'created',
      freeTrialDays,
      isRecurring,
      created_at: new Date().toISOString()
    };

    // If registration data provided, store it with the payment session
    if (registrationData) {
      Object.assign(paymentDetails, { 
        registrationData,
        isRegistrationFlow: true
      });
      
      console.log('Storing registration data with payment session');
    }

    // Save payment session to database
    const { error: sessionError } = await supabaseClient
      .from('payment_sessions')
      .insert({
        id: sessionId,
        user_id: userId || null, // Allow null for registration flow
        email: effectiveEmail,
        plan_id: planId,
        expires_at: expiresAt.toISOString(),
        payment_details: paymentDetails
      });

    if (sessionError) {
      console.error('Error creating payment session:', sessionError);
      throw new Error(`Failed to create payment session: ${sessionError.message}`);
    }

    // Create webhook URL with current hostname or fallback
    let origin = req.headers.get('origin');
    if (!origin) {
      try {
        const url = new URL(req.url);
        origin = `${url.protocol}//${url.hostname}`;
      } catch (e) {
        origin = 'https://ndhakvhrrkczgylcmyoc.supabase.co';
      }
    }
    
    const webhookUrl = `${origin}/functions/v1/cardcom-webhook`;
    
    // Set up redirect URLs for after payment
    let success_url = successRedirectUrl || `${origin}/subscription?success=true&planId=${planId}&lowProfileId=${lowProfileId}`;
    let error_url = errorRedirectUrl || `${origin}/subscription?error=true`;

    console.log('Payment session created successfully', { 
      lowProfileId, 
      sessionId, 
      webhookUrl,
      operation,
      isRegistrationFlow: !!registrationData,
      success_url,
      error_url
    });
    
    // Construct the payment URL for Cardcom
    const paymentUrl = `https://secure.cardcom.solutions/External/LowProfile.aspx?` +
      `TerminalNumber=${terminalNumber}&` + 
      `UserName=${apiName}&` +
      `APILevel=10&` +
      `ReturnValue=${lowProfileId}&` +
      `SumToBill=${amount}&` +
      `ProductName=${encodeURIComponent(planName || 'Subscription')}&` +
      `Language=he&` +
      `CoinID=1&` +
      `SuccessRedirectUrl=${encodeURIComponent(success_url)}&` +
      `ErrorRedirectUrl=${encodeURIComponent(error_url)}&` +
      `IndicatorUrl=${encodeURIComponent(webhookUrl)}`;
    
    return new Response(
      JSON.stringify({
        success: true,
        lowProfileId,
        sessionId,
        terminalNumber,
        apiName,
        webhookUrl,
        url: paymentUrl,
        message: 'Payment session created successfully'
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
