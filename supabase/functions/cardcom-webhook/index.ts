
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

// Format and validate token expiry (limit to 12 months)
const getValidTokenExpiryDate = (tokenExDate: string): string => {
  // Parse the tokenExDate (format YYYYMMDD)
  if (!tokenExDate || tokenExDate.length < 8) {
    // Default to 12 months if no valid date
    const date = new Date();
    date.setMonth(date.getMonth() + 12);
    return date.toISOString().split('T')[0];
  }
  
  try {
    const year = parseInt(tokenExDate.substring(0, 4));
    const month = parseInt(tokenExDate.substring(4, 6)) - 1; // JS months are 0-based
    const day = parseInt(tokenExDate.substring(6, 8));
    
    // Create expiry date from token data
    const expiryDate = new Date(year, month, day);
    
    // Limit token validity to 12 months max
    const maxExpiryDate = new Date();
    maxExpiryDate.setMonth(maxExpiryDate.getMonth() + 12);
    
    // Use whichever is sooner
    if (expiryDate > maxExpiryDate) {
      return maxExpiryDate.toISOString().split('T')[0];
    }
    
    return expiryDate.toISOString().split('T')[0];
  } catch (e) {
    // Default to 12 months if parsing fails
    const date = new Date();
    date.setMonth(date.getMonth() + 12);
    return date.toISOString().split('T')[0];
  }
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
      ReturnValue,
      Operation
    } = webhookData;
    
    if (!LowProfileId && !ReturnValue) {
      throw new Error("Missing payment identification information");
    }
    
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
    const isMonthlyPlan = paymentSession.plan_id === 'monthly';
    const isSuccessful = ResponseCode === 0;
    
    logStep("Processing webhook", {
      isTokenCreation: isMonthlyPlan,
      isSuccessful,
      sessionId: paymentSession.id,
      operationType: Operation
    });

    if (isSuccessful && TokenInfo) {
      // Handle token creation for any operation that includes token creation
      const tokenData = {
        token: TokenInfo.Token,
        expiryMonth: TokenInfo.CardMonth?.toString(),
        expiryYear: TokenInfo.CardYear?.toString(),
        tokenApprovalNumber: TokenInfo.TokenApprovalNumber,
        cardOwnerIdentityNumber: TokenInfo.CardOwnerIdentityNumber,
        tokenExpiryDate: TokenInfo.TokenExDate,
        lastFourDigits: webhookData.TranzactionInfo?.Last4CardDigitsString || 
                       webhookData.TranzactionInfo?.Last4CardDigits?.toString(),
        cardType: webhookData.TranzactionInfo?.CardInfo || 'Unknown'
      };

      // Use a reasonable token expiry (12 months from now instead of 10 years)
      const validTokenExpiry = getValidTokenExpiryDate(TokenInfo.TokenExDate);
      
      logStep("Processed token data with expiry", { 
        token: tokenData.token?.substring(0, 8) + '...',
        originalExpiry: TokenInfo.TokenExDate,
        validTokenExpiry
      });

      if (isMonthlyPlan) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        
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

        if (paymentSession.user_id) {
          try {
            await supabaseAdmin
              .from('recurring_payments')
              .insert({
                user_id: paymentSession.user_id,
                token: tokenData.token,
                token_expiry: validTokenExpiry,
                token_approval_number: tokenData.tokenApprovalNumber,
                last_4_digits: tokenData.lastFourDigits,
                card_type: tokenData.cardType,
                is_valid: true,
                status: 'active',
                created_at: new Date().toISOString()
              });
              
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
              
            logStep("Created subscription with trial period", {
              userId: paymentSession.user_id,
              trialEndsAt: trialEndsAt.toISOString()
            });
          } catch (tokenError) {
            logStep("ERROR storing token/subscription", { error: tokenError.message });
          }
        }
      } else if (!isMonthlyPlan) {
        const paymentDetails = {
          transaction_id: TranzactionId ? TranzactionId.toString() : null,
          transaction_data: webhookData,
          status: 'completed',
          updated_at: new Date().toISOString(),
        };
        
        let paymentMethod = null;
        if (TokenInfo && TokenInfo.Token) {
          paymentMethod = {
            token: TokenInfo.Token,
            expiryMonth: TokenInfo.CardMonth?.toString() || '',
            expiryYear: TokenInfo.CardYear?.toString() || '',
            tokenApprovalNumber: TokenInfo.TokenApprovalNumber || '',
            cardOwnerIdentityNumber: TokenInfo.CardOwnerIdentityNumber || '',
            tokenExpiryDate: validTokenExpiry // Use validated expiry date
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
          
        if (paymentSession.user_id && paymentMethod?.token) {
          const userId = paymentSession.user_id;
          const planId = paymentSession.plan_id;
          const amount = paymentSession.amount;
          
          logStep("Payment succeeded with token, updating user subscription", { 
            userId, 
            planId, 
            hasToken: !!paymentMethod?.token 
          });
          
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
          
          const { data: existingSubscriptions } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['active', 'trial'])
            .order('created_at', { ascending: false })
            .limit(1);
            
          const now = new Date();
          let trialEndsAt = null;
          let nextChargeDate = new Date();
          let currentPeriodEndsAt = new Date();
          
          if (planId === 'monthly') {
            if (!existingSubscriptions || existingSubscriptions.length === 0) {
              trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            }
            nextChargeDate = trialEndsAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            currentPeriodEndsAt = trialEndsAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          } else if (planId === 'annual') {
            nextChargeDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            currentPeriodEndsAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
          }
          
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
          
          if (existingSubscriptions && existingSubscriptions.length > 0) {
            await supabaseAdmin
              .from('subscriptions')
              .update(subscriptionData)
              .eq('id', existingSubscriptions[0].id);
          } else {
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
          
          try {
            // Store token with proper expiration date
            const { data: existingToken } = await supabaseAdmin
              .from('recurring_payments')
              .select('id')
              .eq('token', paymentMethod.token)
              .eq('user_id', userId)
              .limit(1);
              
            if (!existingToken || existingToken.length === 0) {
              await supabaseAdmin
                .from('recurring_payments')
                .insert({
                  user_id: userId,
                  token: paymentMethod.token,
                  token_expiry: validTokenExpiry,
                  token_approval_number: paymentMethod.tokenApprovalNumber,
                  last_4_digits: paymentMethod.lastFourDigits,
                  card_type: paymentMethod.cardType || 'Unknown',
                  is_valid: true,
                  status: 'active',
                  created_at: new Date().toISOString()
                });
              
              logStep("Stored recurring payment token");
            } else {
              logStep("Token already exists in system");
            }
          } catch (tokenError) {
            logStep("ERROR storing recurring token", { error: tokenError.message });
          }
        }
      }
    } else if (!isSuccessful) {
      // Update payment session as failed
      await supabaseAdmin
        .from('payment_sessions')
        .update({
          status: 'failed',
          payment_details: {
            error: Description || 'Unknown error',
            webhookData,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', paymentSession.id);
        
      logStep("Payment failed", { 
        sessionId: paymentSession.id, 
        responseCode: ResponseCode,
        description: Description
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Operation ${isSuccessful ? 'successful' : 'failed'}` 
      }),
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
