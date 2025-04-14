
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration from environment variables
const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
const cardcomUrl = "https://secure.cardcom.solutions";

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

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Create admin client for database operations that bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id });

    // Parse request payload
    const { 
      planId, 
      amount, 
      currency = "ILS", 
      invoiceInfo, 
      operation = "ChargeAndCreateToken",
      redirectUrls 
    } = await req.json();
    
    if (!planId || !amount) {
      throw new Error("Missing required parameters: planId or amount");
    }
    logStep("Validated request parameters", { planId, amount, operation });
    
    // Generate unique transaction reference
    const transactionRef = `${user.id}-${Date.now()}`;
    
    // Get user profile information if available
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();
    
    const fullName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : invoiceInfo?.fullName || '';
    
    // Prepare webhook URL
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook`;
    
    logStep("Preparing CardCom API request", { 
      webhookUrl,
      terminalNumber,
      operation
    });
    
    // Create CardCom API request body
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
      "InvoiceHead.CustName": fullName || user.email || '',
      "InvoiceHead.Email": invoiceInfo?.email || user.email || '',
      "InvoiceHead.Language": "he",
      "InvoiceHead.SendByEmail": "true",
      "InvoiceHead.CoinID": currency === "ILS" ? "1" : "2",
      "InvoiceLines1.Description": `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      "InvoiceLines1.Price": amount.toString(),
      "InvoiceLines1.Quantity": "1"
    }).toString();
    
    logStep("Sending request to CardCom");
    
    // Initialize LowProfile session with CardCom
    const response = await fetch(`${cardcomUrl}/Interface/LowProfile.aspx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: cardcomPayload,
    });
    
    if (!response.ok) {
      throw new Error(`CardCom API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);
    
    const lowProfileCode = responseParams.get("LowProfileCode");
    const responseCode = responseParams.get("ResponseCode");
    const url = responseParams.get("url");
    
    logStep("CardCom response", { 
      responseCode,
      lowProfileCode: lowProfileCode || '',
      hasUrl: !!url
    });
    
    if (responseCode !== "0" || !lowProfileCode) {
      throw new Error(`CardCom initialization failed: ${responseParams.get("Description") || "Unknown error"}`);
    }
    
    // Store transaction details in Supabase
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: user.id,
        low_profile_code: lowProfileCode,
        reference: transactionRef,
        plan_id: planId,
        amount: amount,
        currency: currency,
        status: 'initiated',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
      })
      .select('id')
      .single();
      
    if (sessionError) {
      throw new Error(`Failed to store payment session: ${sessionError.message}`);
    }
    
    logStep("Payment session stored", { sessionId: sessionData?.id });
    
    // Return data for frontend iframe creation
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created",
        data: {
          lowProfileCode: lowProfileCode,
          terminalNumber: terminalNumber,
          sessionId: sessionData.id,
          cardcomUrl: cardcomUrl,
          url: url
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Payment initialization failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
