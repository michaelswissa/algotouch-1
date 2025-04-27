
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-REDIRECT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
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
    
    // CardCom Configuration
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
    const cardcomBaseUrl = "https://secure.cardcom.solutions";
    
    const requestBody = await req.json();
    logStep("Request body", requestBody);
    
    const { 
      planId, 
      amount, 
      invoiceInfo = {},
      redirectUrls,
      userId,
      operation = "ChargeOnly",
      currencyCode = "ILS",
      language = "he"
    } = requestBody;

    // Validate required fields
    if (!amount) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required amount parameter",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!redirectUrls?.success || !redirectUrls?.failed) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required redirect URLs",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate a unique reference for this payment
    const reference = `${planId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    logStep("Generated reference", { reference });
    
    // Generate webhook URL
    const functionsDomain = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1');
    const webhookUrl = `${functionsDomain}/cardcom-webhook`;
    logStep("Webhook URL", { webhookUrl });

    // Prepare request to CardCom
    const createLowProfileUrl = `${cardcomBaseUrl}/api/v11/LowProfile/Create`;
    const fullName = invoiceInfo.fullName || "";
    const email = invoiceInfo.email || "";

    // Create payload for CardCom API
    const lowProfilePayload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      Amount: amount,
      SuccessRedirectUrl: redirectUrls.success,
      FailedRedirectUrl: redirectUrls.failed,
      WebHookUrl: webhookUrl,
      ReturnValue: reference,
      Operation: operation,
      Language: language,
      ISOCoinId: currencyCode === "ILS" ? 1 : (currencyCode === "USD" ? 2 : 1),
      UIDefinition: {
        IsHideCardOwnerName: false,
        CardOwnerNameValue: fullName,
        IsHideCardOwnerEmail: false,
        CardOwnerEmailValue: email,
        IsCardOwnerEmailRequired: true,
        IsHideCardOwnerPhone: false,
        IsCardOwnerPhoneRequired: true
      }
    };
    
    if (invoiceInfo && Object.keys(invoiceInfo).length > 0) {
      lowProfilePayload.Document = {
        Name: invoiceInfo.fullName || email || "Customer",
        Email: email,
        TaxId: invoiceInfo.taxId,
        Phone: invoiceInfo.phone,
        Mobile: invoiceInfo.mobile,
        Comments: `Subscription: ${planId}`,
        IsVatFree: false
      };
    }
    
    logStep("Sending request to CardCom", lowProfilePayload);
    
    // Call CardCom API
    const response = await fetch(createLowProfileUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lowProfilePayload),
    });
    
    const responseData = await response.json();
    logStep("CardCom response", responseData);
    
    if (responseData.ResponseCode !== 0 || !responseData.LowProfileId) {
      throw new Error(responseData.Description || "Failed to create payment page");
    }

    // Store payment session in database
    try {
      const sessionData = {
        user_id: userId,
        plan_id: planId,
        amount: amount,
        currency: currencyCode,
        status: "initiated",
        low_profile_code: responseData.LowProfileId,
        reference: reference,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        payment_details: {
          operation: operation,
          cardcomUrl: cardcomBaseUrl
        }
      };
      
      const { data: paymentSession, error: dbError } = await supabaseAdmin
        .from('payment_sessions')
        .insert(sessionData)
        .select('id')
        .single();
      
      if (dbError) {
        logStep("Error storing payment session", { error: dbError });
        // Continue despite DB error
      } else {
        logStep("Payment session stored", { sessionId: paymentSession?.id });
      }
    } catch (dbError) {
      logStep("Exception storing payment session", { error: dbError });
      // Continue despite DB error
    }

    // Return success with the redirect URL
    const successResponse = {
      success: true,
      message: "Payment page created successfully",
      data: {
        lowProfileCode: responseData.LowProfileId,
        url: responseData.Url,
        reference: reference,
        sessionId: reference,
        terminalNumber: terminalNumber,
        cardcomUrl: cardcomBaseUrl
      }
    };
    
    return new Response(
      JSON.stringify(successResponse),
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
        message: errorMessage || "Failed to create payment page",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
