import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARDCOM_CONFIG = {
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    createLowProfile: "https://secure.cardcom.solutions/api/v11/LowProfile/Create"
  }
};

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
    
    const { action, lowProfileCode, sessionId } = await req.json();
    
    // Handle status check action
    if (action === 'check-status' && lowProfileCode) {
      logStep("Checking transaction status", { lowProfileCode });
      
      const getLowProfileRequest: GetLowProfileRequest = {
        TerminalNumber: parseInt(CARDCOM_CONFIG.terminalNumber),
        ApiName: CARDCOM_CONFIG.apiName,
        LowProfileId: lowProfileCode
      };

      const response = await fetch('https://secure.cardcom.solutions/api/v11/LowProfile/GetById', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getLowProfileRequest),
      });
      
      const responseData: GetLowProfileResult = await response.json();
      logStep("Status check response", responseData);
      
      // Handle different response scenarios
      if (responseData.ResponseCode === 0) {
        // Transaction completed successfully
        if (responseData.TranzactionInfo?.ResponseCode === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              data: responseData,
              message: "Transaction completed successfully"
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        // Transaction failed
        if (responseData.TranzactionInfo?.ResponseCode > 0) {
          return new Response(
            JSON.stringify({
              success: false,
              failed: true,
              data: responseData,
              message: responseData.TranzactionInfo.Description || "Transaction failed"
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        // Transaction still processing
        return new Response(
          JSON.stringify({
            success: false,
            processing: true,
            data: responseData,
            message: "Transaction is still processing"
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Low profile not found or other error
      return new Response(
        JSON.stringify({
          success: false,
          data: responseData,
          message: responseData.Description || "Error checking transaction status"
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
    
    logStep("Received request data", { planId, amount, currency, operationType });

    if (!planId || !amount || !redirectUrls) {
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

    let userEmail = invoiceInfo?.email || registrationData?.email;
    let fullName = invoiceInfo?.fullName || 
                  (registrationData?.userData ? 
                    `${registrationData.userData.firstName || ''} ${registrationData.userData.lastName || ''}`.trim() : 
                    undefined);
    
    const transactionRef = userId 
      ? `${userId}-${Date.now()}`
      : `anon-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook`;
    
    logStep("Preparing Cardcom request", { webhookUrl, transactionRef });

    // Determine operation based on plan and operationType
    let operation: string = "ChargeOnly";
    if (operationType === 'token_only' || planId === 'monthly') {
      operation = "ChargeAndCreateToken";
    }

    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      Operation: operation,
      ReturnValue: transactionRef,
      Amount: amount,
      WebHookUrl: webhookUrl,
      SuccessRedirectUrl: redirectUrls.success,
      FailedRedirectUrl: redirectUrls.failed,
      ProductName: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      Language: "he",
      ISOCoinId: currency === "ILS" ? 1 : 2,
      UIDefinition: {
        IsHideCardOwnerName: false,
        IsHideCardOwnerEmail: false,
        IsHideCardOwnerPhone: false,
        CardOwnerEmailValue: userEmail,
        CardOwnerNameValue: fullName,
        IsCardOwnerEmailRequired: true,
        IsCardOwnerPhoneRequired: true
      },
      Document: invoiceInfo ? {
        Name: fullName || userEmail,
        Email: userEmail,
        DocumentTypeToCreate: "Receipt",
        Products: [{
          Description: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
          UnitCost: amount,
          Quantity: 1,
          TotalLineCost: amount
        }]
      } : undefined
    };
    
    logStep("Sending request to Cardcom");
    
    const response = await fetch(CARDCOM_CONFIG.endpoints.createLowProfile, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardcomPayload),
    });
    
    const responseData = await response.json();
    
    logStep("Cardcom response", responseData);
    
    if (responseData.ResponseCode !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "Cardcom initialization failed",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const sessionData = {
      user_id: userId,
      low_profile_code: responseData.LowProfileId,
      reference: transactionRef,
      plan_id: planId,
      amount: amount,
      currency: currency,
      status: 'initiated',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      anonymous_data: !userId ? { email: userEmail, fullName } : null,
      cardcom_terminal_number: CARDCOM_CONFIG.terminalNumber
    };
    
    let dbSessionId = null;
    
    try {
      if (userId) {
        const { data: dbSession, error: sessionError } = await supabaseAdmin
          .from('payment_sessions')
          .insert(sessionData)
          .select('id')
          .single();
            
        if (!sessionError && dbSession) {
          dbSessionId = dbSession.id;
          logStep("Payment session stored", { sessionId: dbSessionId });
        }
      }
    } catch (dbError) {
      logStep("Error storing payment session", { error: dbError.message });
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created",
        data: {
          sessionId: dbSessionId || `temp-${Date.now()}`,
          lowProfileCode: responseData.LowProfileId,
          terminalNumber: CARDCOM_CONFIG.terminalNumber,
          cardcomUrl: "https://secure.cardcom.solutions"
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
