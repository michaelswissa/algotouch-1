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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Create Supabase admin client
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
      redirectUrls
    } = await req.json();
    
    logStep("Received request data", { 
      planId, 
      amount, 
      currency,
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
    
    // Create unique reference
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}-${String(now.getMilliseconds()).padStart(3, '0')}`;
    const transactionRef = userId 
      ? `user-${userId.split('-')[0]}-${dateStr}`
      : `anon-${Math.random().toString(36).substring(2, 7)}-${dateStr}`;
    
    // Base URL setup for webhook
    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://ndhakvhrrkczgylcmyoc.functions.supabase.co';
    const webhookUrl = `${baseUrl}/functions/v1/cardcom-webhook`;
    
    // For monthly plans, we only create a token without charging
    const isMonthlyPlan = planId === 'monthly';
    const operation = isMonthlyPlan ? 'CreateTokenOnly' : 'ChargeOnly';
    const transactionAmount = isMonthlyPlan ? 0 : amount; // Set amount to 0 for token creation

    // Create CardCom API request body
    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      Operation: operation,
      ReturnValue: transactionRef,
      Amount: transactionAmount,
      WebHookUrl: webhookUrl,
      SuccessRedirectUrl: redirectUrls.success,
      FailedRedirectUrl: redirectUrls.failed,
      ProductName: `מנוי ${isMonthlyPlan ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      Language: "he",
      ISOCoinId: currency === "ILS" ? 1 : 2,
      MaxNumOfPayments: 1,
      UIDefinition: {
        IsHideCardOwnerName: false,
        IsHideCardOwnerEmail: false,
        IsHideCardOwnerPhone: false,
        CardOwnerEmailValue: userEmail,
        CardOwnerNameValue: fullName,
        IsCardOwnerEmailRequired: true,
        IsCardOwnerPhoneRequired: true,
        IsCardOwnerIdentityNumber: true,
        IsCardOwnerNameRequired: true
      },
      Document: invoiceInfo ? {
        Name: fullName || userEmail,
        Email: userEmail,
        Products: [{
          Description: `מנוי ${isMonthlyPlan ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
          UnitCost: transactionAmount,
          Quantity: 1
        }]
      } : undefined,
      JValidateType: isMonthlyPlan ? 2 : undefined, // J2 for simple card validation on monthly plans
      AdvancedDefinition: {
        IsAVSEnabled: true // Enable AVS validation for better security
      }
    };
    
    logStep("Sending request to CardCom", { 
      operation,
      isMonthlyPlan,
      transactionAmount 
    });
    
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
      low_profile_code: lowProfileId,
      reference: transactionRef,
      plan_id: planId,
      amount: amount,
      currency: currency,
      status: 'initiated',
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
          reference: transactionRef 
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
          reference: transactionRef
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
