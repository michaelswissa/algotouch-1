
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";

// Helper function to log steps and data
function logStep(functionName: string, step: string, data: any = {}) {
  console.log(`[${functionName}][${step}]`, JSON.stringify(data));
}

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("CARDCOM-IFRAME", "Function started");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get CardCom configuration
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const apiName = Deno.env.get("CARDCOM_API_NAME");

    if (!terminalNumber || !apiName) {
      throw new Error("Missing CardCom API configuration");
    }

    const requestData = await req.json();
    logStep("CARDCOM-IFRAME", "Request data received", requestData);

    // Validate required parameters
    const { 
      planId, 
      userId, 
      email, 
      fullName, 
      phone,
      idNumber
    } = requestData;

    // Map operation type based on request (token_only -> 3, payment -> 1)
    let operationType = "1"; // Default to ChargeOnly
    if (requestData.operationType === "token_only") {
      operationType = "3"; // CreateTokenOnly
    } else if (planId === 'monthly') {
      // For monthly plan, always use token only (initial registration without payment)
      operationType = "3";
    }

    if (!planId) {
      throw new Error("Missing required parameter: planId");
    }

    if (!email || !fullName) {
      throw new Error("Missing required parameters: email and fullName are required");
    }

    if (!phone || !idNumber) {
      throw new Error("Missing required parameters: phone and idNumber are required");
    }

    // Generate transaction reference
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Get plan details from database
    let amount = 0;
    let productName = "Subscription";

    // Map plan ID to appropriate operation and amount
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (planError) {
      throw new Error(`Error fetching plan details: ${planError.message}`);
    }
    
    if (!plan) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    productName = plan.name || `Plan ${planId}`;
    amount = plan.price || 0;

    // For monthly plan, amount should be 0 (token only)
    if (planId === 'monthly' || operationType === "3") {
      amount = 0;
    }

    logStep("CARDCOM-IFRAME", "Plan details", { 
      planId, 
      productName,
      amount,
      operation: operationType
    });

    // Generate unique ID for session
    const lowProfileId = crypto.randomUUID();

    // Determine base URLs for redirects
    const frontendBaseUrl = Deno.env.get("FRONTEND_URL") || requestOrigin;
    const publicFunctionsUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL") || 
      `${supabaseUrl}/functions/v1`;

    // Create payment session in DB
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .insert({
        user_id: userId,
        anonymous_data: !userId ? { 
          email, 
          fullName, 
          phone, 
          idNumber, 
          createdAt: new Date().toISOString() 
        } : null,
        plan_id: planId,
        amount: amount,
        currency: "ILS",
        status: 'initiated',
        operation_type: operationType,
        reference: transactionRef,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payment_details: { 
          fullName, 
          email, 
          phone, 
          idNumber 
        },
        low_profile_id: lowProfileId
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error("Database insert error:", sessionError);
      throw new Error("Failed to create payment session: " + sessionError.message);
    }

    logStep("CARDCOM-IFRAME", "Created payment session", {
      sessionId: sessionData.id,
      lowProfileId,
      operation: operationType,
      amount
    });

    // Build CardCom LowProfile URL - NOTE: this is the direct URL approach per CardCom documentation
    const cardComUrl = new URL("https://secure.cardcom.solutions/Interface/LowProfile.aspx");
    
    // Add required query parameters (note: key names are case-sensitive)
    cardComUrl.searchParams.append('TerminalNumber', terminalNumber);
    cardComUrl.searchParams.append('UserName', apiName); // Use the ApiName as UserName
    cardComUrl.searchParams.append('ReturnValue', transactionRef);
    cardComUrl.searchParams.append('SumToBill', amount.toString());
    cardComUrl.searchParams.append('CoinId', '1'); // ILS
    cardComUrl.searchParams.append('Language', 'he');
    cardComUrl.searchParams.append('ProductName', productName);
    
    // Add operation type
    cardComUrl.searchParams.append('Operation', operationType);
    
    // Add redirect URLs
    cardComUrl.searchParams.append('SuccessRedirectUrl', 
      `${frontendBaseUrl}/subscription/success?session_id=${sessionData.id}&ref=${transactionRef}`);
    cardComUrl.searchParams.append('ErrorRedirectUrl', 
      `${frontendBaseUrl}/subscription/failed?session_id=${sessionData.id}&ref=${transactionRef}`);
    cardComUrl.searchParams.append('IndicatorUrl', 
      `${publicFunctionsUrl}/cardcom-webhook`);
    
    // Add customer details
    cardComUrl.searchParams.append('CardOwnerName', fullName);
    cardComUrl.searchParams.append('CardOwnerEmail', email);
    cardComUrl.searchParams.append('CardOwnerPhone', phone);
    cardComUrl.searchParams.append('CardOwnerId', idNumber);
    
    logStep("CARDCOM-IFRAME", "Generated CardCom URL", { url: cardComUrl.toString() });

    // Return the data directly without making additional API calls
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment initialized successfully",
        data: {
          iframeUrl: cardComUrl.toString(),
          sessionId: sessionData.id,
          lowProfileId: lowProfileId,
          reference: transactionRef,
          terminalNumber
        }
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[CARDCOM-IFRAME] Error: ${errorMessage}`);
    
    const status = 
      errorMessage.includes("Invalid plan ID") || 
      errorMessage.includes("Missing required") ? 400 : 500;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage 
      }),
      { 
        status, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
