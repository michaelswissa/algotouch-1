
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

// Helper to sanitize and trim strings
function sanitizeString(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).trim();
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
      errorRedirectUrl,
      contractDetails // Contract details if provided
    } = requestBody;
    
    // Validate required parameters
    const requiredParams = ['planId', 'amount'];
    const validationError = validateRequiredParams(requestBody, requiredParams);
    if (validationError) {
      throw new Error(validationError);
    }
    
    // Use either email or userEmail (prefer userEmail if both exist)
    const effectiveEmail = sanitizeString(userEmail || email);
    
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
      hasContractDetails: !!contractDetails,
      amount
    });
    
    // Get Cardcom credentials and sanitize them
    const terminalNumber = sanitizeString(Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL"));
    const apiName = sanitizeString(Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME"));
    
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
    
    // First, store contract details in separate table if provided
    let contractId = null;
    if (contractDetails) {
      try {
        console.log('Storing contract details separately...');
        const { data: contractData, error: contractError } = await supabaseClient
          .from('contract_signatures')
          .insert({
            user_id: userId || null,
            plan_id: planId,
            full_name: contractDetails.fullName || userName || '',
            email: effectiveEmail,
            signature: contractDetails.signature || '',
            contract_html: contractDetails.contractHtml || '',
            agreed_to_terms: contractDetails.agreedToTerms || false,
            agreed_to_privacy: contractDetails.agreedToPrivacy || false,
            contract_version: contractDetails.contractVersion || "1.0",
            browser_info: contractDetails.browserInfo || null,
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null
          })
          .select('id')
          .single();
        
        if (contractError) {
          console.error('Error storing contract:', contractError);
        } else if (contractData) {
          contractId = contractData.id;
          console.log('Contract stored with ID:', contractId);
        }
      } catch (error) {
        console.error('Exception while saving contract:', error);
        // Continue with payment even if contract storage fails
      }
    }

    // Payment details including reference to contract if saved
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
      created_at: new Date().toISOString(),
      // Reference contract ID instead of storing full details
      contractId: contractId
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
    
    // Set up redirect URLs for after payment - ensure they are properly encoded
    let success_url = successRedirectUrl || `${origin}/subscription?success=true&planId=${encodeURIComponent(planId)}&lowProfileId=${encodeURIComponent(lowProfileId)}`;
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
    
    // Construct the payment URL for Cardcom with properly encoded parameters
    const paymentUrl = `https://secure.cardcom.solutions/External/LowProfile.aspx?` +
      `TerminalNumber=${encodeURIComponent(terminalNumber)}&` + 
      `UserName=${encodeURIComponent(apiName)}&` +
      `APILevel=10&` +
      `ReturnValue=${encodeURIComponent(lowProfileId)}&` +
      `SumToBill=${encodeURIComponent(String(amount))}&` +
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
