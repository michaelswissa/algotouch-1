
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

    const userEmail = invoiceInfo?.email || registrationData?.email;
    const fullName = invoiceInfo?.fullName || 
                  (registrationData?.userData ? 
                    `${registrationData.userData.firstName || ''} ${registrationData.userData.lastName || ''}`.trim() : 
                    undefined);
    
    const transactionRef = userId 
      ? `${userId}-${Date.now()}`
      : `anon-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook`;
    
    logStep("Preparing CardCom API request", { 
      webhookUrl,
      transactionRef,
      userEmail,
      fullName
    });

    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      UserName: CARDCOM_CONFIG.apiName,
      Password: CARDCOM_CONFIG.apiPassword,
      Operation: planId === 'vip' ? 'ChargeOnly' : 'ChargeAndCreateToken',
      ReturnValue: transactionRef,
      Amount: amount,
      WebHookUrl: webhookUrl,
      SuccessRedirectUrl: redirectUrls.success,
      FailedRedirectUrl: redirectUrls.failed,
      ProductName: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      Language: "he",
      ISOCoinId: currency === "ILS" ? 1 : 2,
      MaxNumOfPayments: 1,
      Email: userEmail,
      InvoiceName: fullName || userEmail
    };
    
    logStep("Sending request to CardCom");
    
    // Perform the API call with proper error handling
    const res = await fetch(CARDCOM_CONFIG.endpoints.createLowProfile, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardcomPayload),
    });

    if (!res.ok) {
      logStep("ERROR: CardCom Create returned HTTP", { 
        status: res.status, 
        statusText: res.statusText 
      });
      
      // Try to get error details from response
      try {
        const errorText = await res.text();
        logStep("CardCom error response", { errorText });
      } catch (e) {
        // Ignore error reading response
      }
      
      throw new Error(`CardCom Create failed with status ${res.status}`);
    }
    
    // Get the response as text first to log it
    const responseText = await res.text();
    logStep("CardCom raw text response", { responseText });
    
    // Parse as JSON
    let response;
    try {
      response = JSON.parse(responseText);
      logStep("CardCom parsed response", response);
    } catch (parseError) {
      logStep("ERROR: Failed to parse CardCom response as JSON", { error: parseError.message });
      throw new Error("Invalid JSON response from CardCom");
    }
    
    // Validate the response structure
    if (!response) {
      logStep("ERROR: Empty response from CardCom");
      throw new Error("Empty response from CardCom");
    }
    
    // Check for LowProfileId
    if (!response.LowProfileId) {
      logStep("ERROR: Missing LowProfileId in response", response);
      // Check if there's an error message in the response
      if (response.Description) {
        throw new Error(`CardCom error: ${response.Description}`);
      }
      throw new Error("CardCom initialization failed - missing LowProfileId");
    }

    const sessionData = {
      user_id: userId,
      low_profile_id: response.LowProfileId,
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
          logStep("Payment session stored in DB", { sessionId: dbSessionId });
        }
      }
    } catch (dbError) {
      logStep("Error storing payment session", { error: dbError.message });
    }
    
    // Construct the success response with consistent field names
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created",
        data: {
          sessionId: dbSessionId || `temp-${Date.now()}`,
          lowProfileId: response.LowProfileId,
          terminalNumber: CARDCOM_CONFIG.terminalNumber,
          cardcomUrl: "https://secure.cardcom.solutions",
          url: response.Url || "" // Include url field consistently
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
