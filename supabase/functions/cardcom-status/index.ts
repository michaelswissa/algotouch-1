
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
const cardcomUrl = "https://secure.cardcom.solutions";

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Create Supabase clients
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
    const { lowProfileCode, sessionId } = await req.json();
    
    if (!lowProfileCode) {
      throw new Error("Missing required parameter: lowProfileCode");
    }
    logStep("Validated request parameters", { lowProfileCode, sessionId });
    
    // Validate session belongs to user if sessionId is provided
    if (sessionId) {
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('payment_sessions')
        .select('id, user_id, status')
        .eq('id', sessionId)
        .single();
        
      if (sessionError || !sessionData) {
        throw new Error("Payment session not found");
      }
      
      if (sessionData.user_id !== user.id) {
        throw new Error("Unauthorized access to payment session");
      }
      
      logStep("Session validated", { 
        sessionId, 
        currentStatus: sessionData.status 
      });
      
      // If status is already set as completed or failed, return immediately
      if (sessionData.status === 'completed' || sessionData.status === 'failed') {
        return new Response(
          JSON.stringify({
            success: sessionData.status === 'completed',
            status: sessionData.status,
            message: sessionData.status === 'completed' 
              ? "Payment already completed" 
              : "Payment already failed",
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    // Query CardCom API for transaction status
    const queryParams = new URLSearchParams({
      terminalnumber: terminalNumber,
      username: apiName,
      lowprofilecode: lowProfileCode
    });
    
    logStep("Querying CardCom for payment status");
    
    const response = await fetch(
      `${cardcomUrl}/Interface/BillGoldGetLowProfileIndicator.aspx?${queryParams.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`CardCom API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);
    
    // Extract relevant fields
    const operationResponse = responseParams.get("OperationResponse") || "";
    const internalDealNumber = responseParams.get("InternalDealNumber") || null;
    const dealResponse = responseParams.get("DealResponse") || "";
    const tokenResponse = responseParams.get("TokenResponse") || "";
    const token = responseParams.get("Token") || null;
    const tokenExDate = responseParams.get("TokenExDate") || null;
    const cardValidityYear = responseParams.get("CardValidityYear") || null;
    const cardValidityMonth = responseParams.get("CardValidityMonth") || null;
    
    const isSuccessful = operationResponse === "0";
    
    logStep("CardCom status response", { 
      operationResponse,
      internalDealNumber,
      hasToken: !!token
    });
    
    // Update session status if session ID is provided
    if (sessionId) {
      const status = isSuccessful ? 'completed' : 'failed';
      
      const updateData: any = {
        status,
        transaction_id: internalDealNumber,
        transaction_data: Object.fromEntries(responseParams.entries())
      };
      
      // Store payment method details for recurring payments if successful
      if (isSuccessful && token) {
        const paymentMethod = {
          token: token,
          tokenExpiryDate: tokenExDate,
          lastFourDigits: responseParams.get("CardNumber5") || "0000",
          expiryMonth: cardValidityMonth,
          expiryYear: cardValidityYear
        };
        
        updateData.payment_method = paymentMethod;
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('payment_sessions')
        .update(updateData)
        .eq('id', sessionId);
        
      if (updateError) {
        logStep("Failed to update session status", { error: updateError.message });
      } else {
        logStep("Updated session status", { status });
      }
      
      // If payment was successful, update the subscription record
      if (isSuccessful) {
        try {
          // Get plan details
          const { data: session } = await supabaseAdmin
            .from('payment_sessions')
            .select('plan_id, payment_method')
            .eq('id', sessionId)
            .single();
          
          if (session) {
            const planId = session.plan_id;
            
            // Calculate trial/subscription periods
            const now = new Date();
            let trialEndsAt = null;
            let nextChargeDate = null;
            let currentPeriodEndsAt = null;
            
            // Set appropriate dates based on plan type
            if (planId === 'monthly') {
              // Monthly plan with trial
              trialEndsAt = new Date(now);
              trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial
              
              nextChargeDate = new Date(trialEndsAt);
              currentPeriodEndsAt = new Date(nextChargeDate);
              currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
            } else if (planId === 'annual') {
              // Annual plan with trial
              trialEndsAt = new Date(now);
              trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
              
              nextChargeDate = new Date(trialEndsAt);
              currentPeriodEndsAt = new Date(nextChargeDate);
              currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
            } else if (planId === 'vip') {
              // VIP plan - no trial, lifetime access
              currentPeriodEndsAt = null; // Never expires
              nextChargeDate = null; // No recurring charge
            }
            
            // Create or update subscription record
            const { data: existingSubscription } = await supabaseAdmin
              .from('subscriptions')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (existingSubscription) {
              // Update existing subscription
              await supabaseAdmin
                .from('subscriptions')
                .update({
                  plan_type: planId,
                  status: 'trial',
                  next_charge_date: nextChargeDate,
                  trial_ends_at: trialEndsAt,
                  current_period_ends_at: currentPeriodEndsAt,
                  payment_method: session.payment_method,
                  updated_at: now.toISOString()
                })
                .eq('id', existingSubscription.id);
            } else {
              // Create new subscription
              await supabaseAdmin
                .from('subscriptions')
                .insert({
                  user_id: user.id,
                  plan_type: planId,
                  status: planId === 'vip' ? 'active' : 'trial',
                  next_charge_date: nextChargeDate,
                  trial_ends_at: trialEndsAt,
                  current_period_ends_at: currentPeriodEndsAt,
                  payment_method: session.payment_method
                });
            }
            
            logStep("Updated subscription record", { planId });
          }
        } catch (error: any) {
          logStep("Failed to update subscription", { error: error.message });
        }
      }
    }
    
    // Return payment status with additional details
    return new Response(
      JSON.stringify({
        success: isSuccessful,
        status: isSuccessful ? 'completed' : 'failed',
        message: isSuccessful 
          ? "Payment completed successfully" 
          : `Payment failed: ${responseParams.get("Description") || "Unknown error"}`,
        data: {
          transactionId: internalDealNumber,
          responseCode: operationResponse,
          dealResponse,
          tokenResponse,
          hasToken: !!token
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
        message: errorMessage || "Payment status check failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
