
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Create Supabase admin client for database operations that bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request payload and validate required fields
    const { 
      planId, 
      amount, 
      currency = "ILS", 
      invoiceInfo, 
      operation = "ChargeAndCreateToken",
      redirectUrls,
      userId,
      registrationData
    } = await req.json();
    
    logStep("Received request data", { 
      planId, 
      amount, 
      currency,
      hasUserId: !!userId,
      hasRegistrationData: !!registrationData
    });

    // Validate required parameters
    if (!planId || !amount) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters: planId or amount",
        }), {
          status: 200, // Return 200 even for validation errors
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Get user information - either from auth token, userId passed, or registration data
    let finalUserId = userId;
    let userEmail = null;
    let fullName = '';

    // If no userId was passed but we have registration data, try to match with existing user
    if (!finalUserId && registrationData?.email) {
      userEmail = registrationData.email;
      const userData = registrationData.userData || {};
      fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }

    // For invoice and reference, use either provided info or defaults    
    userEmail = invoiceInfo?.email || registrationData?.email || "anonymous@example.com";
    fullName = invoiceInfo?.fullName || 
              (registrationData?.userData ? 
                `${registrationData.userData.firstName || ''} ${registrationData.userData.lastName || ''}`.trim() : 
                "Anonymous User");
    
    // Generate unique transaction reference with validation
    const transactionRef = finalUserId 
      ? `${finalUserId}-${Date.now()}`
      : `anon-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    
    // Prepare webhook URL with full domain
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook`;
    
    logStep("Preparing CardCom API request", { 
      webhookUrl,
      operation,
      transactionRef
    });

    // Validate CardCom credentials
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    
    if (!terminalNumber || !apiName) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "CardCom configuration is missing",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create CardCom API request body with validation
    const cardcomPayload = new URLSearchParams({
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      Operation: operation,
      ReturnValue: transactionRef,
      Amount: amount.toString(),
      CoinID: currency === "ILS" ? "1" : "2",
      Language: "he",
      WebHookUrl: webhookUrl,
      SuccessRedirectUrl: redirectUrls?.success || `${req.headers.get('origin')}/subscription/success`,
      FailedRedirectUrl: redirectUrls?.failed || `${req.headers.get('origin')}/subscription/failed`,
      ProductName: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      APILevel: "10",
      "InvoiceHead.CustName": fullName || userEmail || '',
      "InvoiceHead.Email": invoiceInfo?.email || userEmail || '',
      "InvoiceHead.Language": "he",
      "InvoiceHead.SendByEmail": "true",
      "InvoiceHead.CoinID": currency === "ILS" ? "1" : "2",
      "InvoiceLines1.Description": `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      "InvoiceLines1.Price": amount.toString(),
      "InvoiceLines1.Quantity": "1",
      // Enable 3DS for better security
      "AdvancedDefinition.ThreeDSecureState": "Enabled"
    }).toString();
    
    logStep("Sending request to CardCom");
    
    // Initialize payment session with CardCom
    const response = await fetch("https://secure.cardcom.solutions/Interface/LowProfile.aspx", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: cardcomPayload,
    });
    
    // Handle CardCom API errors gracefully
    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);
    
    const lowProfileCode = responseParams.get("LowProfileCode");
    const responseCode = responseParams.get("ResponseCode");
    const errorDescription = responseParams.get("Description");
    const url = responseParams.get("url");
    
    logStep("CardCom response", { 
      responseCode,
      lowProfileCode: lowProfileCode || '',
      hasUrl: !!url,
      description: errorDescription || ''
    });
    
    if (responseCode !== "0" || !lowProfileCode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: errorDescription || "CardCom initialization failed",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Store payment session in database 
    const sessionData = {
      user_id: finalUserId,
      low_profile_code: lowProfileCode,
      reference: transactionRef,
      plan_id: planId,
      amount: amount,
      currency: currency,
      status: 'initiated',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
      anonymous_data: !finalUserId ? { email: userEmail, fullName } : null
    };
    
    let dbSessionId = "temp-" + Date.now(); // Default temporary ID
    
    // Store the session in database if possible
    try {
      if (finalUserId) {
        // For authenticated users, store in payment_sessions
        const { data: dbSession, error: sessionError } = await supabaseAdmin
          .from('payment_sessions')
          .insert(sessionData)
          .select('id')
          .single();
            
        if (sessionError) {
          logStep("Database error (non-fatal)", { error: sessionError.message });
          // Don't fail - we can still proceed with payment even if DB write fails
        } else if (dbSession) {
          dbSessionId = dbSession.id;
          logStep("Payment session stored in DB", { sessionId: dbSessionId });
        }
      } else {
        logStep("Created anonymous payment session", { lowProfileCode });
      }
    } catch (dbError) {
      logStep("Error storing payment session", { error: dbError.message });
      // Continue even if storage fails
    }
    
    // Return success response with CardCom data
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created",
        data: {
          lowProfileCode: lowProfileCode,
          terminalNumber: terminalNumber,
          sessionId: dbSessionId,
          cardcomUrl: "https://secure.cardcom.solutions",
          url: url
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Return error response with 200 status code
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Payment initialization failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
