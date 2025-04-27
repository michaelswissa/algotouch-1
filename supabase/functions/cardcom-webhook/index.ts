import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook called");

    // Create Supabase admin client for database operations that bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse the webhook data
    let webhookData;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      webhookData = await req.json();
      logStep("Received JSON webhook data", webhookData);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      webhookData = Object.fromEntries(formData.entries());
      logStep("Received form webhook data", webhookData);
    } else {
      const text = await req.text();
      logStep("Received unknown format webhook data", { text, contentType });
      try {
        // Try to parse as JSON as a fallback
        webhookData = JSON.parse(text);
        logStep("Successfully parsed text as JSON", webhookData);
      } catch (e) {
        logStep("Failed to parse webhook data", { error: e.message });
        throw new Error(`Unsupported content type: ${contentType}`);
      }
    }

    // Extract key fields from the webhook data
    const {
      ResponseCode,
      Description,
      LowProfileId, 
      TranzactionId,
      ReturnValue,
      Operation,
      TokenInfo,
      TranzactionInfo
    } = webhookData;
    
    logStep("Extracted webhook data fields", { 
      ResponseCode, 
      LowProfileId, 
      TranzactionId,
      ReturnValue,
      Operation,
      hasTokenInfo: !!TokenInfo,
      hasTranzactionInfo: !!TranzactionInfo
    });

    // Return early if essential data is missing
    if (!LowProfileId && !ReturnValue) {
      logStep("ERROR: Missing LowProfileId and ReturnValue");
      throw new Error("Missing required payment identification information");
    }
    
    // Find the corresponding payment session
    let paymentQuery = supabaseAdmin.from('payment_sessions').select('*');
    
    // First try to find by LowProfileId (as stored in low_profile_id)
    if (LowProfileId) {
      paymentQuery = paymentQuery.eq('low_profile_id', LowProfileId);
    } 
    // If no LowProfileId, try to find by ReturnValue (as stored in reference)
    else if (ReturnValue) {
      paymentQuery = paymentQuery.eq('reference', ReturnValue);
    }
    
    // Find the most recent session that matches
    const { data: paymentSessions, error: sessionsError } = await paymentQuery
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (sessionsError || !paymentSessions || paymentSessions.length === 0) {
      logStep("ERROR: Payment session not found", { 
        LowProfileId, 
        ReturnValue,
        error: sessionsError?.message || 'No matching payment session found' 
      });
      
      // Log this error but don't throw an exception to return a 200 status to CardCom
      return new Response(
        JSON.stringify({ success: false, message: "Payment session not found" }),
        {
          status: 200, // Return 200 even for errors, as CardCom expects this
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const paymentSession = paymentSessions[0];
    logStep("Found payment session", { 
      sessionId: paymentSession.id, 
      userId: paymentSession.user_id, 
      status: paymentSession.status 
    });
    
    // Check if payment was successful
    let paymentStatus = 'failed';
    if (ResponseCode === 0) {
      paymentStatus = 'completed';
    }
    
    // Extract payment details
    const paymentDetails = {
      transaction_id: TranzactionId ? TranzactionId.toString() : null,
      transaction_data: webhookData,
      status: paymentStatus,
      updated_at: new Date().toISOString(),
    };
    
    // Extract token information if available
    let paymentMethod = null;
    if (TokenInfo && TokenInfo.Token) {
      paymentMethod = {
        token: TokenInfo.Token,
        expiryMonth: TokenInfo.CardMonth?.toString() || '',
        expiryYear: TokenInfo.CardYear?.toString() || '',
        tokenApprovalNumber: TokenInfo.TokenApprovalNumber || '',
        cardOwnerIdentityNumber: TokenInfo.CardOwnerIdentityNumber || '',
        tokenExpiryDate: TokenInfo.TokenExDate || ''
      };
      
      if (TranzactionInfo && TranzactionInfo.Last4CardDigits) {
        paymentMethod.lastFourDigits = TranzactionInfo.Last4CardDigits.toString();
      } else if (TranzactionInfo && TranzactionInfo.Last4CardDigitsString) {
        paymentMethod.lastFourDigits = TranzactionInfo.Last4CardDigitsString;
      }
      
      if (TranzactionInfo && TranzactionInfo.CardInfo) {
        paymentMethod.cardType = TranzactionInfo.CardInfo;
      }
    }
    
    // Update the payment session with the results
    logStep("Updating payment session", { 
      sessionId: paymentSession.id, 
      newStatus: paymentStatus,
      hasToken: !!paymentMethod?.token
    });
    
    await supabaseAdmin
      .from('payment_sessions')
      .update({
        ...paymentDetails,
        payment_details: paymentMethod ? { paymentMethod } : null
      })
      .eq('id', paymentSession.id);
    
    // If payment was successful and we have a token, we can update or create a subscription
    if (paymentStatus === 'completed' && paymentSession.user_id && paymentMethod?.token) {
      const userId = paymentSession.user_id;
      const planId = paymentSession.plan_id;
      const amount = paymentSession.amount;
      
      logStep("Payment succeeded with token, updating user subscription", { 
        userId, 
        planId, 
        hasToken: !!paymentMethod?.token 
      });
      
      // Create a new payment log entry
      await supabaseAdmin
        .from('payment_logs')
        .insert({
          user_id: userId,
          transaction_id: TranzactionId?.toString() || '',
          amount: amount,
          currency: paymentSession.currency || 'ILS',
          plan_id: planId,
          payment_status: 'succeeded',
          payment_data: webhookData
        });
      
      // Check if user already has a subscription
      const { data: existingSubscriptions } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1);
        
      // Calculate subscription dates
      const now = new Date();
      let trialEndsAt = null;
      let nextChargeDate = new Date();
      let currentPeriodEndsAt = new Date();
      
      if (planId === 'monthly') {
        // For monthly subscriptions, add trial only if it's a new subscription
        if (!existingSubscriptions || existingSubscriptions.length === 0) {
          trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days trial (updated from 14 to match planData.ts)
        }
        nextChargeDate = trialEndsAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        currentPeriodEndsAt = trialEndsAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      } else if (planId === 'annual') {
        // No trial for annual plans
        nextChargeDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        currentPeriodEndsAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      } else if (planId === 'vip') {
        // VIP plan is lifetime, set dates far in the future (10 years)
        const farFuture = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
        nextChargeDate = farFuture;
        currentPeriodEndsAt = farFuture;
        
        // Log special handling for VIP plan
        logStep("Processing VIP lifetime plan", { userId });
      }
      
      // Prepare subscription data
      const subscriptionData = {
        user_id: userId,
        plan_type: planId,
        status: trialEndsAt ? 'trial' : 'active',
        next_charge_date: nextChargeDate.toISOString(),
        current_period_ends_at: currentPeriodEndsAt.toISOString(),
        trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
        payment_method: paymentMethod,
        updated_at: now.toISOString()
      };
      
      // Insert or update the subscription
      if (existingSubscriptions && existingSubscriptions.length > 0) {
        // Update existing subscription
        await supabaseAdmin
          .from('subscriptions')
          .update(subscriptionData)
          .eq('id', existingSubscriptions[0].id);
          
        logStep("Updated existing subscription", { subscriptionId: existingSubscriptions[0].id });
      } else {
        // Create new subscription
        const { data: newSubscription, error: subscriptionError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            ...subscriptionData,
            created_at: now.toISOString()
          })
          .select('id')
          .single();
          
        if (subscriptionError) {
          logStep("ERROR creating subscription", { error: subscriptionError.message });
        } else {
          logStep("Created new subscription", { subscriptionId: newSubscription.id });
        }
      }
      
      // Also store the payment token for recurring payments
      try {
        // Check if we already have this token stored
        const { data: existingToken } = await supabaseAdmin
          .from('recurring_payments')
          .select('id')
          .eq('token', paymentMethod.token)
          .eq('user_id', userId)
          .limit(1);
          
        if (!existingToken || existingToken.length === 0) {
          // Format token expiry date correctly from MM/YY to a proper date
          let tokenExpiry = null;
          if (paymentMethod.expiryMonth && paymentMethod.expiryYear) {
            const month = parseInt(paymentMethod.expiryMonth);
            const year = 2000 + parseInt(paymentMethod.expiryYear); // Assuming 2-digit year
            tokenExpiry = new Date(year, month - 1, 1); // First day of the expiry month
          }
          
          // Store the token
          await supabaseAdmin
            .from('recurring_payments')
            .insert({
              user_id: userId,
              token: paymentMethod.token,
              token_expiry: tokenExpiry ? tokenExpiry.toISOString().split('T')[0] : null,
              token_approval_number: paymentMethod.tokenApprovalNumber,
              last_4_digits: paymentMethod.lastFourDigits,
              card_type: paymentMethod.cardType || 'Unknown',
              is_valid: true,
              status: 'active'
            });
            
          logStep("Stored recurring payment token");
        } else {
          logStep("Token already exists in system");
        }
      } catch (tokenError) {
        logStep("ERROR storing recurring token", { error: tokenError.message });
        // Continue despite error - this is not critical to the payment flow
      }
    }

    // Return success to CardCom
    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment ${paymentStatus}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook processing", { message: errorMessage });
    
    // Return a 200 status even for errors, as CardCom expects this response code
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Error processing payment webhook",
      }),
      {
        status: 200, // Return 200 even for errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
