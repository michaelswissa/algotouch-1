import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook called");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    let webhookData;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      webhookData = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      webhookData = Object.fromEntries(formData.entries());
    } else {
      const text = await req.text();
      try {
        webhookData = JSON.parse(text);
      } catch (e) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
    }

    logStep("Received webhook data", webhookData);

    const {
      ResponseCode,
      Description,
      LowProfileId,
      TokenInfo,
      TranzactionId,
      ReturnValue
    } = webhookData;
    
    if (!LowProfileId && !ReturnValue) {
      throw new Error("Missing payment identification information");
    }
    
    // Find the payment session
    const { data: paymentSessions } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .or(`low_profile_code.eq.${LowProfileId},reference.eq.${ReturnValue}`)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!paymentSessions?.length) {
      throw new Error("Payment session not found");
    }
    
    const paymentSession = paymentSessions[0];
    
    // Determine if this was a token creation or payment
    const isTokenCreation = TokenInfo && !TranzactionId;
    const isSuccessful = ResponseCode === 0;
    
    logStep("Processing webhook", {
      isTokenCreation,
      isSuccessful,
      sessionId: paymentSession.id
    });

    if (isSuccessful) {
      // Handle successful token creation
      if (isTokenCreation && TokenInfo) {
        const tokenData = {
          token: TokenInfo.Token,
          expiryMonth: TokenInfo.CardMonth?.toString(),
          expiryYear: TokenInfo.CardYear?.toString(),
          tokenApprovalNumber: TokenInfo.TokenApprovalNumber,
          cardOwnerIdentityNumber: TokenInfo.CardOwnerIdentityNumber,
          tokenExpiryDate: TokenInfo.TokenExDate
        };

        // Calculate trial end date (14 days from now)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        
        // Update payment session with token info
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: 'completed',
            payment_details: {
              tokenInfo: tokenData,
              type: 'token_creation',
              createdAt: new Date().toISOString()
            }
          })
          .eq('id', paymentSession.id);

        // Create subscription with trial period
        if (paymentSession.user_id) {
          await supabaseAdmin
            .from('subscriptions')
            .upsert({
              user_id: paymentSession.user_id,
              plan_type: 'monthly',
              status: 'trial',
              trial_ends_at: trialEndsAt.toISOString(),
              next_charge_date: trialEndsAt.toISOString(),
              payment_method: tokenData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      } else {
        // Handle successful payment
        // Extract payment details
        const paymentDetails = {
          transaction_id: TranzactionId ? TranzactionId.toString() : null,
          transaction_data: webhookData,
          status: 'completed',
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
          
          if (webhookData.TranzactionInfo && webhookData.TranzactionInfo.Last4CardDigits) {
            paymentMethod.lastFourDigits = webhookData.TranzactionInfo.Last4CardDigits.toString();
          } else if (webhookData.TranzactionInfo && webhookData.TranzactionInfo.Last4CardDigitsString) {
            paymentMethod.lastFourDigits = webhookData.TranzactionInfo.Last4CardDigitsString;
          }
          
          if (webhookData.TranzactionInfo && webhookData.TranzactionInfo.CardInfo) {
            paymentMethod.cardType = webhookData.TranzactionInfo.CardInfo;
          }
        }
        
        // Update the payment session with the results
        logStep("Updating payment session", { 
          sessionId: paymentSession.id, 
          newStatus: 'completed',
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
        if (paymentSession.user_id && paymentMethod?.token) {
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
              trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
            }
            nextChargeDate = trialEndsAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
            currentPeriodEndsAt = trialEndsAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
          } else if (planId === 'annual') {
            // No trial for annual plans
            nextChargeDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            currentPeriodEndsAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
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
      }
    } else {
      // Update session status for failed attempts
      await supabaseAdmin
        .from('payment_sessions')
        .update({
          status: 'failed',
          payment_details: {
            error: Description,
            responseCode: ResponseCode,
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', paymentSession.id);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Operation ${isSuccessful ? 'successful' : 'failed'}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logStep("Error in webhook", { error: error.message });
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
