
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced logging function with structured output
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-PAYMENT] ${step}${detailsStr}`);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const body = await req.json()
    const { planId, amount, currency = "ILS", invoiceInfo, userId, registrationData, redirectUrls } = body
    
    logStep("Received request data", { 
      planId, 
      amount, 
      currency, 
      hasUserId: !!userId, 
      hasInvoiceInfo: !!invoiceInfo 
    })

    if (!planId || !redirectUrls) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Gather reference and user data
    let userEmail = invoiceInfo?.email || registrationData?.email
    let fullName = invoiceInfo?.fullName || 
      (registrationData?.userData ? `${registrationData.userData.firstName || ''} ${registrationData.userData.lastName || ''}`.trim() : undefined)
    
    // Generate unique reference
    const transactionRef = userId 
      ? `${userId}-${Date.now()}` 
      : `anon-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`
    
    // Prepare webhook URL with full domain
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook`
    
    logStep("Preparing CardCom API request", { 
      webhookUrl,
      transactionRef,
      userEmail,
      fullName
    })
    
    // Plan-to-amount and operation logic
    let operation = "ChargeOnly"
    let actualAmount = amount

    if (planId === 'monthly') {
      operation = "CreateTokenOnly"
      actualAmount = 0 // token only, do not charge
    } else if (planId === 'vip') {
      operation = 'ChargeOnly'
      // actualAmount left as is
    } else {
      operation = 'ChargeAndCreateToken' // default for annual?
    }
    
    logStep("Operation details", {
      operation,
      actualAmount,
      planId
    })
    
    // === CRITICAL FIX for "document total product sum not equal to credit card sum to bill" ===
    
    // Only send the Document block if it is relevant for invoicing
    // Make sure the products sum = Amount exactly
    let cardcomDocument: any = undefined
    if (invoiceInfo) {
      // For monthly plan, unit cost must also be 0  
      let docAmount = planId === 'monthly' ? 0 : amount
      cardcomDocument = {
        Name: fullName || userEmail,
        Email: userEmail,
        Products: [{
          Description: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
          UnitCost: docAmount,
          Quantity: 1
        }]
        // Additional fields if absolutely needed can be added here
      }
    }
    
    // === END FIX ===

    const cardcomPayload = {
      TerminalNumber: Deno.env.get('CARDCOM_TERMINAL_NUMBER'),
      ApiName: Deno.env.get('CARDCOM_API_NAME'),
      Operation: operation,
      ReturnValue: transactionRef,
      Amount: actualAmount,
      WebHookUrl: webhookUrl,
      SuccessRedirectUrl: redirectUrls.success,
      FailedRedirectUrl: redirectUrls.failed,
      ProductName: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
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
        reCaptchaFieldCSS: "body { margin: 0; padding:0; display: flex; }",
        placeholder: "1111-2222-3333-4444",
        cvvPlaceholder: "123"
      },
      Document: cardcomDocument, // only if required and properly structured
      AdvancedDefinition: {
        JValidateType: planId === 'monthly' ? 2 : 5,
        ShouldOpenPinpadOnPageLoad: false
      }
    }
    
    logStep("Sending request to CardCom", cardcomPayload)
    
    // Initialize payment session with CardCom
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardcomPayload),
    })
    
    const responseData = await response.json()
    
    logStep("CardCom response", responseData)
    
    if (responseData.ResponseCode !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "CardCom initialization failed",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Store payment session in database
    const sessionExpiry = new Date(Date.now() + 30 * 60 * 1000) // 30 min expiry
    
    // For monthly plans, set next charge date to 30 days from now
    let initialNextChargeDate = null
    if (planId === 'monthly') {
      const nextChargeDate = new Date()
      nextChargeDate.setDate(nextChargeDate.getDate() + 30)
      initialNextChargeDate = nextChargeDate.toISOString()
    }

    const sessionData = {
      user_id: userId,
      low_profile_code: responseData.LowProfileId,
      reference: transactionRef,
      plan_id: planId,
      amount: amount,
      currency: currency,
      status: 'initiated',
      expires_at: sessionExpiry.toISOString(),
      anonymous_data: !userId ? { email: userEmail, fullName } : null,
      cardcom_terminal_number: Deno.env.get('CARDCOM_TERMINAL_NUMBER'),
      operation_type: planId === 'monthly' ? 'token_only' : 'payment',
      initial_next_charge_date: initialNextChargeDate
    }
    
    let dbSessionId = null
    
    try {
      if (userId) {
        // Initialize Supabase client
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        const { data: dbSession, error: sessionError } = await supabaseAdmin
          .from('payment_sessions')
          .insert(sessionData)
          .select('id')
          .single()
            
        if (!sessionError && dbSession) {
          dbSessionId = dbSession.id
          logStep("Payment session stored in DB", { sessionId: dbSessionId })
        }
      }
    } catch (dbError) {
      logStep("Error storing payment session", { error: dbError.message })
      // Don't fail the request if DB storage fails
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created",
        data: {
          sessionId: dbSessionId || `temp-${Date.now()}`,
          lowProfileCode: responseData.LowProfileId,
          terminalNumber: Deno.env.get('CARDCOM_TERMINAL_NUMBER'),
          cardcomUrl: "https://secure.cardcom.solutions",
          operationType: planId === 'monthly' ? 'token_only' : 'payment'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStep("ERROR", { message: errorMessage })
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Payment initialization failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
