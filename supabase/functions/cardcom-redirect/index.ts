
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration - Replace with your actual credentials
const CARDCOM_CONFIG = {
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    createLowProfile: "https://secure.cardcom.solutions/api/v11/LowProfile/Create"
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CARDCOM-REDIRECT] Function started");
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Parse request parameters
    const { 
      planId, 
      amount, 
      currency = "ILS", 
      invoiceInfo, 
      userId,
      redirectUrls
    } = await req.json();
    
    console.log("[CARDCOM-REDIRECT] Received request data", { 
      planId, 
      amount, 
      currency,
      hasUserId: !!userId,
      hasInvoiceInfo: !!invoiceInfo
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

    // Create a unique reference ID for this transaction
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getTime()}`;
    const transactionRef = userId 
      ? `user-${userId.split('-')[0]}-${dateStr}` 
      : `anon-${Math.random().toString(36).substring(2, 7)}-${dateStr}`;
    
    // Use a full URL for the webhook
    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://ndhakvhrrkczgylcmyoc.functions.supabase.co';
    const webhookUrl = `${baseUrl}/functions/v1/cardcom-webhook`;
    
    console.log("[CARDCOM-REDIRECT] Preparing CardCom API request", { 
      webhookUrl,
      transactionRef
    });

    // Create CardCom API request for iframe/redirect creation
    const cardcomPayload = {
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      Operation: planId === 'monthly' ? 'ChargeAndCreateToken' : 'ChargeOnly',
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
        CardOwnerEmailValue: invoiceInfo?.email || '',
        CardOwnerNameValue: invoiceInfo?.fullName || '',
        IsCardOwnerEmailRequired: true
      },
      Document: invoiceInfo ? {
        Name: invoiceInfo.fullName || invoiceInfo.email || '',
        Email: invoiceInfo.email || '',
        Products: [{
          Description: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
          UnitCost: amount,
          Quantity: 1
        }]
      } : undefined
    };
    
    console.log("[CARDCOM-REDIRECT] Sending request to CardCom");
    
    // Call CardCom API to create iframe/redirect URL
    const response = await fetch(CARDCOM_CONFIG.endpoints.createLowProfile, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardcomPayload),
    });
    
    const responseData = await response.json();
    console.log("[CARDCOM-REDIRECT] CardCom response", responseData);
    
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
    
    // Store payment session in database
    const sessionData = {
      user_id: userId,
      low_profile_code: responseData.LowProfileId,
      reference: transactionRef,
      plan_id: planId,
      amount: amount,
      currency: currency,
      status: 'initiated',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      anonymous_data: !userId ? { email: invoiceInfo?.email, fullName: invoiceInfo?.fullName } : null,
      cardcom_terminal_number: CARDCOM_CONFIG.terminalNumber
    };
    
    let dbSessionId = null;
    
    try {
      const { data: dbSession, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .insert(sessionData)
        .select('id')
        .single();
          
      if (!sessionError && dbSession) {
        dbSessionId = dbSession.id;
        console.log("[CARDCOM-REDIRECT] Payment session stored in DB", { 
          sessionId: dbSessionId, 
          lowProfileId: responseData.LowProfileId,
          reference: transactionRef 
        });
      } else {
        console.log("[CARDCOM-REDIRECT] Error storing payment session", { error: sessionError });
      }
    } catch (dbError) {
      console.log("[CARDCOM-REDIRECT] Exception storing payment session", { error: dbError.message });
    }
    
    // Return the redirect URL and session info to the client
    return new Response(
      JSON.stringify({
        success: true,
        message: "Redirect URL created successfully",
        data: {
          sessionId: dbSessionId || `temp-${Date.now()}`,
          url: responseData.Url,
          lowProfileCode: responseData.LowProfileId,
          terminalNumber: CARDCOM_CONFIG.terminalNumber
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CARDCOM-REDIRECT] ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Failed to create CardCom redirect URL",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
