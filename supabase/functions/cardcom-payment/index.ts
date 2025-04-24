import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration
const CARDCOM_CONFIG = {
  terminalNumber: 160138,
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    master: "https://secure.cardcom.solutions/api/openfields/master",
    cardNumber: "https://secure.cardcom.solutions/api/openfields/cardNumber",
    cvv: "https://secure.cardcom.solutions/api/openfields/CVV",
    createLowProfile: "https://secure.cardcom.solutions/api/v11/LowProfile/Create",
    getLpResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLowProfileResult"
  },
  domain: "https://algotouch.lovable.app",
  successUrl: "https://algotouch.lovable.app/payment/success",
  failedUrl: "https://algotouch.lovable.app/payment/failed",
  webhookUrl: "https://algotouch.lovable.app/api/cardcom-webhook"
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
    
    // Parse request data
    const requestData = await req.json();
    
    // Check if this is a status check request
    if (requestData.action === 'check-status') {
      return await handleStatusCheck(requestData, supabaseAdmin);
    }
    
    // Handle payment initialization
    const { 
      planId, 
      amount, 
      currency = "ILS", 
      invoiceInfo, 
      userId,
      registrationData,
      redirectUrls,
      payload,
      operationType = 'payment'
    } = requestData;
    
    logStep("Received request data", { 
      planId, 
      amount, 
      currency,
      hasUserId: !!userId,
      hasRegistrationData: !!registrationData,
      operationType,
      hasPayload: !!payload
    });

    // Validate required fields
    if (!planId || (amount === undefined && !payload?.Amount)) {
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
    
    const transactionRef = userId 
      ? `${userId}-${planId}-${Date.now()}`
      : `${planId}-guest-${Date.now()}`;
    
    // Use custom payload if provided or build the default one
    const cardcomPayload = payload || {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      Operation: planId === 'monthly' 
        ? 'CreateTokenOnly' 
        : planId === 'annual' 
          ? 'ChargeAndCreateToken' 
          : 'ChargeOnly',
      ReturnValue: transactionRef,
      Amount: amount,
      WebHookUrl: CARDCOM_CONFIG.webhookUrl,
      SuccessRedirectUrl: redirectUrls?.success || CARDCOM_CONFIG.successUrl,
      FailedRedirectUrl: redirectUrls?.failed || CARDCOM_CONFIG.failedUrl,
      ProductName: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      Language: "he",
      ISOCoinId: currency === "ILS" ? 1 : 2,
      Document: invoiceInfo ? {
        Name: fullName || userEmail,
        Email: userEmail,
        Products: [{
          Description: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
          UnitCost: amount,
          Quantity: 1
        }]
      } : undefined
    };
    
    logStep("Preparing CardCom API request", {
      operation: cardcomPayload.Operation,
      amount: cardcomPayload.Amount,
      webhookUrl: cardcomPayload.WebHookUrl,
      transactionRef: cardcomPayload.ReturnValue
    });

    // Call CardCom API to create low profile
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
          message: responseData.Description || "שגיאה באתחול התשלום",
          details: responseData
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Store payment session in database 
    const sessionData = {
      user_id: userId || null,
      low_profile_code: responseData.LowProfileId,
      reference: transactionRef,
      plan_id: planId,
      amount: amount || 0,
      currency: currency,
      status: 'initiated',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      payment_details: {
        operationType: operationType,
        planId: planId
      }
    };
    
    // If we don't have a user_id, store the anonymous data
    if (!userId && (userEmail || fullName)) {
      // @ts-ignore - We know the structure is correct
      sessionData.payment_details = {
        ...sessionData.payment_details,
        anonymousData: { email: userEmail, fullName }
      };
    }
    
    let dbSessionId = null;
    
    try {
      const { data: dbSession, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .insert(sessionData)
        .select('id')
        .single();
          
      if (!sessionError && dbSession) {
        dbSessionId = dbSession.id;
        logStep("Payment session stored in DB", { sessionId: dbSessionId });
      } else if (sessionError) {
        logStep("Error storing payment session", { error: sessionError.message });
      }
    } catch (dbError) {
      logStep("Exception storing payment session", { error: dbError.message });
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "תהליך התשלום הותחל בהצלחה",
        data: {
          sessionId: dbSessionId || `temp-${Date.now()}`,
          lowProfileCode: responseData.LowProfileId,
          terminalNumber: CARDCOM_CONFIG.terminalNumber,
          cardcomUrl: "https://secure.cardcom.solutions",
          operation: cardcomPayload.Operation  // Send the operation back to frontend
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
        message: "שגיאה באתחול התשלום",
        error: errorMessage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleStatusCheck(requestData, supabaseAdmin) {
  const { lowProfileCode, sessionId, operationType, planType } = requestData;
  
  if (!lowProfileCode || !sessionId) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "חסרים פרטים נדרשים לבדיקת סטטוס התשלום"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  logStep("Checking payment status", { lowProfileCode, sessionId, operationType, planType });
  
  // First check DB for existing completed payment
  try {
    // Check if we already have a completed payment with this low profile ID
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .eq('status', 'completed')
      .maybeSingle();
      
    if (!sessionError && sessionData) {
      logStep("Found completed payment in database", sessionData);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "תשלום הושלם בהצלחה",
          data: {
            transactionId: sessionData.transaction_id,
            token: sessionData.payment_details?.token,
            tokenExpiryDate: sessionData.payment_details?.tokenExpiryDate,
            lastFourDigits: sessionData.payment_details?.lastFourDigits
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Check payment logs for token creation
    const { data: paymentLogData, error: paymentLogError } = await supabaseAdmin
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileCode)
      .in('status', ['payment_success', 'token_created'])
      .maybeSingle();
      
    if (!paymentLogError && paymentLogData) {
      logStep("Found payment log entry", paymentLogData);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "תשלום הושלם בהצלחה",
          data: {
            transactionId: paymentLogData.transaction_id,
            token: paymentLogData.payment_data?.token,
            tokenExpiryDate: paymentLogData.payment_data?.tokenExpiryDate,
            lastFourDigits: paymentLogData.payment_data?.lastFourDigits
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (dbError) {
    logStep("Error checking database for payment status", { error: dbError.message });
    // Continue to check CardCom API
  }
  
  // Check CardCom API for status since we didn't find it in the DB
  try {
    const request = {
      ApiName: CARDCOM_CONFIG.apiName,
      ApiPassword: CARDCOM_CONFIG.apiPassword,
      LowProfileId: lowProfileCode
    };
    
    const response = await fetch(CARDCOM_CONFIG.endpoints.getLpResult, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    
    const result = await response.json();
    logStep("CardCom status check response", result);
    
    if (result.ResponseCode !== 0) {
      // Still processing or other status
      return new Response(
        JSON.stringify({
          processing: true,
          message: "התשלום בתהליך עיבוד"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Success response
    if (result.ResponseCode === 0 && result.TranzactionInfo?.ResponseCode === 0) {
      // For token operations, check TokenInfo
      if (operationType === 'token_only' && result.TokenInfo?.Token) {
        // Save payment details to database
        try {
          await updatePaymentSession(supabaseAdmin, lowProfileCode, {
            status: 'completed',
            transaction_id: result.TranzactionInfo.TranzactionId,
            payment_details: {
              token: result.TokenInfo.Token,
              tokenExpiryDate: result.TokenInfo.TokenExDate,
              lastFourDigits: result.TranzactionInfo.Last4CardDigits,
              responseData: result
            }
          });
        } catch (dbError) {
          logStep("Error updating database with token info", { error: dbError.message });
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "אמצעי התשלום נשמר בהצלחה",
            data: {
              token: result.TokenInfo.Token,
              tokenExpiryDate: result.TokenInfo.TokenExDate,
              lastFourDigits: result.TranzactionInfo.Last4CardDigits,
              transactionId: result.TranzactionInfo.TranzactionId
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } 
      // For payment operations, check TransactionInfo
      else if (result.TranzactionInfo) {
        // Save payment details to database
        try {
          let paymentDetails: any = {
            transactionId: result.TranzactionInfo.TranzactionId,
            responseData: result
          };
          
          // If token was also created (for annual plan)
          if (result.TokenInfo?.Token) {
            paymentDetails.token = result.TokenInfo.Token;
            paymentDetails.tokenExpiryDate = result.TokenInfo.TokenExDate;
            paymentDetails.lastFourDigits = result.TranzactionInfo.Last4CardDigits;
          }
          
          await updatePaymentSession(supabaseAdmin, lowProfileCode, {
            status: 'completed',
            transaction_id: result.TranzactionInfo.TranzactionId,
            payment_details: paymentDetails
          });
        } catch (dbError) {
          logStep("Error updating database with payment info", { error: dbError.message });
        }
        
        const responseData: any = {
          transactionId: result.TranzactionInfo.TranzactionId
        };
        
        // Include token info if available
        if (result.TokenInfo?.Token) {
          responseData.token = result.TokenInfo.Token;
          responseData.tokenExpiryDate = result.TokenInfo.TokenExDate;
          responseData.lastFourDigits = result.TranzactionInfo.Last4CardDigits;
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "התשלום הושלם בהצלחה",
            data: responseData
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    // Failed payment
    if (result.TranzactionInfo?.ResponseCode !== 0) {
      // Update payment session to failed
      try {
        await updatePaymentSession(supabaseAdmin, lowProfileCode, {
          status: 'failed',
          payment_details: {
            failureReason: result.TranzactionInfo.Description || 'Transaction failed',
            responseData: result
          }
        });
      } catch (dbError) {
        logStep("Error updating database with failure info", { error: dbError.message });
      }
      
      return new Response(
        JSON.stringify({
          failed: true,
          message: result.TranzactionInfo.Description || "התשלום נכשל",
          error: result
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Still processing or no specific status found
    return new Response(
      JSON.stringify({
        processing: true,
        message: "התשלום בתהליך עיבוד",
        details: result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error checking payment status via API", { error: errorMessage });
    
    return new Response(
      JSON.stringify({
        processing: true,
        message: "שגיאה בבדיקת סטטוס התשלום",
        error: errorMessage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function updatePaymentSession(supabase, lowProfileCode, updateData) {
  const { error } = await supabase
    .from('payment_sessions')
    .update(updateData)
    .eq('low_profile_code', lowProfileCode);
    
  if (error) {
    logStep("Error updating payment session", { error: error.message });
    throw error;
  }
}
