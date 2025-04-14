
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

// Helper function to sanitize and trim strings
function sanitizeString(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).trim();
}

// Helper to sanitize all URL parameters
function encodeParameter(value: string | number | boolean): string {
  // First convert to string if not already
  const stringValue = typeof value !== 'string' ? String(value) : value;
  // Then properly encode
  return encodeURIComponent(stringValue.trim());
}

serve(async (req) => {
  // Add detailed logging for debugging
  console.log('Request received at cardcom-openfields endpoint');
  
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Processing payment initialization request');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed:', {
        planId: requestBody.planId,
        amount: requestBody.amount,
        userEmail: requestBody.userEmail || requestBody.email,
        hasRegistrationData: !!requestBody.registrationData
      });
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      throw new Error('Invalid request body: Could not parse JSON');
    }
    
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
      registrationData,
      successRedirectUrl,
      errorRedirectUrl
    } = requestBody;
    
    // Use either email or userEmail (prefer userEmail if both exist)
    const effectiveEmail = sanitizeString(userEmail || email);
    
    // Email is required - validate strictly
    if (!effectiveEmail) {
      console.error('Missing email address in request');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required parameter: email or userEmail' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check for required amount parameter
    if (amount === undefined || amount === null) {
      console.error('Missing amount in request');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required parameter: amount' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Creating payment session for:', { 
      planId, 
      userId, 
      userEmail: effectiveEmail, 
      userName, 
      hasRegistrationData: !!registrationData,
      amount
    });
    
    // Get Cardcom credentials and sanitize them
    const terminalNumber = sanitizeString(Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL"));
    const apiName = sanitizeString(Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME"));
    
    if (!terminalNumber || !apiName) {
      console.error('Missing Cardcom API credentials');
      throw new Error('Missing Cardcom API credentials in environment variables');
    }

    console.log('Using Cardcom credentials:', {
      terminalNumber: terminalNumber.substring(0, 2) + '...',
      apiName: apiName.substring(0, 2) + '...'
    });

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
    
    // Payment details
    const paymentDetails = {
      lowProfileId,
      amount,
      planName: sanitizeString(planName || ''),
      planId: sanitizeString(planId || ''),
      userName: sanitizeString(userName || ''),
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
    console.log('Saving payment session to database', {
      sessionId, 
      userId, 
      email: effectiveEmail, 
      planId
    });
    
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
        console.error('Error extracting origin from URL:', e);
        origin = 'https://ndhakvhrrkczgylcmyoc.supabase.co';
      }
    }
    
    const webhookUrl = `${origin}/functions/v1/cardcom-webhook`;
    
    // Set up redirect URLs for after payment
    let success_url = successRedirectUrl || `${origin}/subscription?success=true&planId=${encodeParameter(planId)}&lowProfileId=${encodeParameter(lowProfileId)}`;
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
    
    // Construct the payment URL for Cardcom - minimizing the amount of parameters
    const paymentUrl = `https://secure.cardcom.solutions/Interface/LowProfile.aspx?` +
      `TerminalNumber=${encodeParameter(terminalNumber)}&` + 
      `UserName=${encodeParameter(apiName)}&` +
      `APILevel=10&` +
      `ReturnValue=${encodeParameter(lowProfileId)}&` +
      `SumToBill=${encodeParameter(String(amount))}&` +
      `ProductName=${encodeParameter(planName || 'Subscription')}&` +
      `Language=he&` +
      `CoinID=1&` +
      `SuccessRedirectUrl=${encodeParameter(success_url)}&` +
      `ErrorRedirectUrl=${encodeParameter(error_url)}&` +
      `IndicatorUrl=${encodeParameter(webhookUrl)}`;
    
    console.log('Payment URL generated successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        lowProfileId,
        sessionId,
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
