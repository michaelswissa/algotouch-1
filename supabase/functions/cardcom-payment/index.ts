
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration
const CARDCOM_CONFIG = {
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    master: "https://secure.cardcom.solutions/api/openfields/master",
    cardNumber: "https://secure.cardcom.solutions/api/openfields/cardNumber",
    cvv: "https://secure.cardcom.solutions/api/openfields/CVV",
    createLowProfile: "https://secure.cardcom.solutions/api/v11/LowProfile/Create"
  }
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
    
    const { 
      planId, 
      amount, 
      currency = "ILS", 
      invoiceInfo, 
      userId,
      registrationData,
      redirectUrls,
      operationType = 'payment'
    } = await req.json();
    
    logStep("Received request data", { 
      planId, 
      amount, 
      currency,
      operationType,
      hasUserId: !!userId,
      hasRegistrationData: !!registrationData
    });

    if (!planId || !redirectUrls) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user information and prepare transaction reference
    let userEmail = invoiceInfo?.email || registrationData?.email;
    let fullName = invoiceInfo?.fullName || 
                  (registrationData?.userData ? 
                    `${registrationData.userData.firstName || ''} ${registrationData.userData.lastName || ''}`.trim() : 
                    undefined);
    
    // Create a unique reference ID for this transaction
    // Format: user-YYYY-MM-DD-HH-MM-SS-MS
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}-${String(now.getMilliseconds()).padStart(3, '0')}`;
    const transactionRef = userId 
      ? `user-${userId.split('-')[0]}-${dateStr}`  // Take only first part of UUID for brevity
      : `anon-${Math.random().toString(36).substring(2, 7)}-${dateStr}`;
    
    // Use an absolute URL for the webhook
    // The webhook URL should be an absolute URL where CardCom will send the payment result
    const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL');
    let webhookUrl;
    
    if (publicSiteUrl) {
      webhookUrl = `${publicSiteUrl}/api/cardcom-webhook`;
    } else {
      const supabaseProjectId = supabaseUrl.match(/\/\/([^.]+)/)?.[1];
      webhookUrl = `https://${supabaseProjectId}.functions.supabase.co/cardcom-webhook`;
    }
    
    logStep("Preparing CardCom API request", { 
      webhookUrl,
      transactionRef,
      userEmail,
      fullName,
      operationType
    });

    // Determine operation based on planId and operationType
    let operation = "ChargeOnly";
    let cardcomAmount = amount || 0;

    // If it's a monthly subscription or explicit token_only request, use token creation
    if (operationType === 'token_only' || planId === 'monthly') {
      operation = "CreateTokenOnly";
      // For token creation operations, set amount to 0 - we're just validating the card
      cardcomAmount = 0;
    } else if (planId === 'annual') {
      operation = "ChargeOnly"; 
      cardcomAmount = amount || 3371;
    } else if (planId === 'vip') {
      operation = "ChargeOnly";
      cardcomAmount = amount || 13121;
    }

    // Create CardCom API request body for payment initialization
    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      Operation: operation,
      ReturnValue: transactionRef,
      Amount: cardcomAmount,
      WebHookUrl: webhookUrl,
      SuccessRedirectUrl: redirectUrls.success,
      FailedRedirectUrl: redirectUrls.failed,
      ProductName: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      Language: "he",
      ISOCoinId: currency === "ILS" ? 1 : 2,
      MaxNumOfPayments: 1, // No installments allowed
      UIDefinition: {
        IsHideCardOwnerName: false,
        IsHideCardOwnerEmail: false,
        IsHideCardOwnerPhone: false,
        CardOwnerEmailValue: userEmail,
        CardOwnerNameValue: fullName,
        IsCardOwnerEmailRequired: true,
        reCaptchaFieldCSS: "body { margin: 0; padding:0; display: flex; }",
        placeholder: "1111-2222-3333-4444",
        cvvPlaceholder: "123"
      },
      Document: invoiceInfo && operation === "ChargeOnly" ? {
        Name: fullName || userEmail,
        Email: userEmail,
        Products: [{
          Description: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
          UnitCost: cardcomAmount,
          Quantity: 1
        }]
      } : undefined
    };
    
    logStep("Sending request to CardCom with operation:", operation);
    
    // Initialize payment session with CardCom
    const response = await fetch(CARDCOM_CONFIG.endpoints.createLowProfile, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardcomPayload),
    });
    
    const responseData = await response.json();
    
    logStep("CardCom response", responseData);
    
    if (responseData.ResponseCode !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "CardCom initialization failed",
          responseCode: responseData.ResponseCode
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Validate LowProfileId format (should be a GUID)
    const lowProfileId = responseData.LowProfileId;
    if (!lowProfileId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lowProfileId)) {
      logStep("ERROR: Invalid LowProfileId format", { lowProfileId });
      throw new Error("Invalid LowProfileId returned from CardCom");
    }
    
    // Store payment session in database 
    const sessionData = {
      user_id: userId,
      low_profile_code: lowProfileId, // This matches the LowProfileId from CardCom response
      reference: transactionRef, // This matches the ReturnValue we sent to CardCom
      plan_id: planId,
      amount: cardcomAmount,
      currency: currency,
      status: 'initiated',
      operation_type: operation,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
      anonymous_data: !userId ? { email: userEmail, fullName } : null,
      cardcom_terminal_number: CARDCOM_CONFIG.terminalNumber
    };
    
    let dbSessionId = null;
    
    try {
      // Always store session data regardless of user status to ensure webhook can find it
      const { data: dbSession, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .insert(sessionData)
        .select('id')
        .single();
          
      if (!sessionError && dbSession) {
        dbSessionId = dbSession.id;
        logStep("Payment session stored in DB", { 
          sessionId: dbSessionId, 
          lowProfileId,
          reference: transactionRef,
          operation 
        });
      } else {
        logStep("Error storing payment session", { error: sessionError });
        // Continue despite DB error to allow payment flow to proceed
      }
    } catch (dbError) {
      logStep("Exception storing payment session", { error: dbError.message });
      // Don't fail the request if DB storage fails
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created",
        data: {
          sessionId: dbSessionId || `temp-${Date.now()}`,
          lowProfileCode: lowProfileId,
          terminalNumber: CARDCOM_CONFIG.terminalNumber,
          cardcomUrl: "https://secure.cardcom.solutions",
          reference: transactionRef,
          operation: operation
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
