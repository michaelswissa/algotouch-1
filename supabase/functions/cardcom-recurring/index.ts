import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration
const CARDCOM_CONFIG = {
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    lowProfile: "https://secure.cardcom.solutions/api/v11/LowProfile/Create",
    transactions: "https://secure.cardcom.solutions/api/v11/Transactions/Transaction"
  }
};

// Plan prices
const PLAN_PRICES = {
  monthly: 371,
  annual: 3371,
  vip: 13121
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-RECURRING] ${step}${detailsStr}`);
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
    
    const body = await req.json();
    const { action, subscriptionId } = body;

    if (action === 'setup') {
      // Handle setting up recurring payments (implemented in previous code)
      const { token, planType, tokenExpiryDate, lastFourDigits, nextChargeDate } = body;
      
      if (action !== 'setup' || !token || !planType) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "חסרים פרטים נדרשים להגדרת תשלום מחזורי"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      logStep("Setting up recurring payment", { planType, token, hasExpiry: !!tokenExpiryDate });
      
      // For monthly plan, we need to set up immediate charge after trial
      if (planType === 'monthly') {
        // Calculate trial end date (30 days from now)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        
        // Save subscription information
        const subscriptionData = {
          plan_id: planType,
          token: token,
          token_expiry_date: tokenExpiryDate,
          last_four_digits: lastFourDigits,
          status: 'active',
          next_payment_date: trialEndDate.toISOString(),
          amount: PLAN_PRICES.monthly,
          payment_details: {
            planType: planType,
            trialEndsAt: trialEndDate.toISOString(),
            tokenCreatedAt: new Date().toISOString()
          }
        };
        
        try {
          const { data: subscription, error: subscriptionError } = await supabaseAdmin
            .from('user_subscriptions')
            .insert(subscriptionData)
            .select('id')
            .single();
            
          if (subscriptionError) {
            logStep("Error saving subscription", { error: subscriptionError.message });
            throw new Error("שגיאה בשמירת פרטי המנוי");
          }
          
          logStep("Monthly subscription set up successfully", { subscriptionId: subscription.id });
          
          return new Response(
            JSON.stringify({
              success: true,
              message: "תשלום מחזורי הוגדר בהצלחה",
              data: {
                subscriptionId: subscription.id,
                planType: planType,
                nextPaymentDate: trialEndDate.toISOString(),
                amount: PLAN_PRICES.monthly
              }
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          throw error;
        }
      } 
      // For annual plan, set up renewal in 1 year
      else if (planType === 'annual') {
        // Calculate renewal date
        const renewalDate = nextChargeDate || (() => {
          const date = new Date();
          date.setFullYear(date.getFullYear() + 1);
          return date.toISOString();
        })();
        
        // Save subscription information
        const subscriptionData = {
          plan_id: planType,
          token: token,
          token_expiry_date: tokenExpiryDate,
          last_four_digits: lastFourDigits,
          status: 'active',
          next_payment_date: renewalDate,
          amount: PLAN_PRICES.annual,
          payment_details: {
            planType: planType,
            tokenCreatedAt: new Date().toISOString(),
            paidUntil: renewalDate
          }
        };
        
        try {
          const { data: subscription, error: subscriptionError } = await supabaseAdmin
            .from('user_subscriptions')
            .insert(subscriptionData)
            .select('id')
            .single();
            
          if (subscriptionError) {
            logStep("Error saving subscription", { error: subscriptionError.message });
            throw new Error("שגיאה בשמירת פרטי המנוי");
          }
          
          logStep("Annual subscription set up successfully", { subscriptionId: subscription.id });
          
          return new Response(
            JSON.stringify({
              success: true,
              message: "תשלום שנתי הוגדר בהצלחה",
              data: {
                subscriptionId: subscription.id,
                planType: planType,
                nextPaymentDate: renewalDate,
                amount: PLAN_PRICES.annual
              }
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          throw error;
        }
      }
      // For VIP plan, no recurring setup needed, just mark as lifetime
      else if (planType === 'vip') {
        // Save subscription information
        const subscriptionData = {
          plan_id: planType,
          token: token,
          token_expiry_date: tokenExpiryDate,
          last_four_digits: lastFourDigits,
          status: 'lifetime',
          amount: PLAN_PRICES.vip,
          payment_details: {
            planType: planType,
            purchasedAt: new Date().toISOString(),
            isLifetime: true
          }
        };
        
        try {
          const { data: subscription, error: subscriptionError } = await supabaseAdmin
            .from('user_subscriptions')
            .insert(subscriptionData)
            .select('id')
            .single();
            
          if (subscriptionError) {
            logStep("Error saving subscription", { error: subscriptionError.message });
            throw new Error("שגיאה בשמירת פרטי המנוי");
          }
          
          logStep("VIP subscription set up successfully", { subscriptionId: subscription.id });
          
          return new Response(
            JSON.stringify({
              success: true,
              message: "מנוי VIP הוגדר בהצלחה",
              data: {
                subscriptionId: subscription.id,
                planType: planType,
                isLifetime: true,
                amount: PLAN_PRICES.vip
              }
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          throw error;
        }
      }
      
      // Unknown plan type
      return new Response(
        JSON.stringify({
          success: false,
          message: "סוג מנוי לא מוכר"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    else if (action === 'charge-monthly-subscriptions') {
      // Process monthly recurring charges for subscriptions whose next charge date is today or past
      logStep("Processing monthly charges");
      
      // Get all active monthly subscriptions due for charging
      const now = new Date();
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .select(`
          id, 
          user_id, 
          token, 
          next_payment_date,
          amount,
          payment_details,
          plan_id
        `)
        .eq('plan_id', 'monthly')
        .eq('status', 'active')
        .lte('next_payment_date', now.toISOString())
        .order('next_payment_date', { ascending: true });
      
      if (subError) {
        logStep("Error fetching subscriptions", { error: subError.message });
        throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
      }
      
      if (!subscriptions || subscriptions.length === 0) {
        logStep("No subscriptions due for charging");
        return new Response(JSON.stringify({
          success: true,
          message: "No subscriptions due for charging",
          charged: 0
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      logStep(`Found ${subscriptions.length} subscriptions to charge`);
      
      // Process each subscription
      const results = [];
      for (const subscription of subscriptions) {
        try {
          // Get user details
          const { data: user, error: userError } = await supabaseAdmin
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', subscription.user_id)
            .single();
            
          if (userError || !user) {
            logStep(`Error fetching user ${subscription.user_id}`, { error: userError?.message });
            results.push({
              subscriptionId: subscription.id,
              success: false,
              error: `User not found: ${userError?.message || 'No user data'}`
            });
            continue;
          }
          
          // Use email from auth if not in profile
          let userEmail = user.email;
          if (!userEmail) {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(subscription.user_id);
            userEmail = authUser?.user?.email || '';
          }
          
          if (!userEmail) {
            results.push({
              subscriptionId: subscription.id,
              success: false,
              error: "User email not found"
            });
            continue;
          }
          
          // Full name from profile
          const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || userEmail;
          
          // Create charge request through LowProfile
          const payload = {
            TerminalNumber: parseInt(CARDCOM_CONFIG.terminalNumber),
            ApiName: CARDCOM_CONFIG.apiName,
            Operation: "ChargeAndCreateToken", // Charge and update token
            Amount: PLAN_PRICES.monthly.toString(),
            ReturnValue: `monthly-charge-${subscription.id}-${Date.now()}`,
            SuccessRedirectUrl: `${Deno.env.get('PUBLIC_SITE_URL') || 'https://algotouch.lovable.app'}/payment/success`,
            FailedRedirectUrl: `${Deno.env.get('PUBLIC_SITE_URL') || 'https://algotouch.lovable.app'}/payment/failed`,
            WebHookUrl: `${Deno.env.get('PUBLIC_SITE_URL') || 'https://algotouch.lovable.app'}/api/cardcom-webhook`,
            Document: {
              Name: fullName,
              Email: userEmail,
              Products: [{
                Description: 'מנוי חודשי - חיוב חודשי',
                UnitCost: PLAN_PRICES.monthly.toString(),
                Quantity: 1
              }]
            },
            Token: subscription.token // Use stored token for charging
          };
          
          // Make request to CardCom
          logStep(`Charging subscription ${subscription.id} for user ${subscription.user_id}`);
          const response = await fetch(CARDCOM_CONFIG.endpoints.lowProfile, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          const chargeResult = await response.json();
          
          if (chargeResult.ResponseCode === 0) {
            // Success - update next payment date (+1 month)
            const nextPaymentDate = new Date();
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            
            // Update subscription record with new payment date and token
            await supabaseAdmin
              .from('user_subscriptions')
              .update({
                next_payment_date: nextPaymentDate.toISOString(),
                token: chargeResult.TokenInfo?.Token || subscription.token,
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id);
            
            // Log the successful payment
            await supabaseAdmin
              .from('user_payment_logs')
              .insert({
                user_id: subscription.user_id,
                subscription_id: subscription.id,
                token: chargeResult.TokenInfo?.Token || subscription.token,
                amount: PLAN_PRICES.monthly,
                currency: 'ILS',
                status: 'payment_success',
                transaction_id: chargeResult.TranzactionId?.toString() || null,
                payment_data: {
                  lowProfileId: chargeResult.LowProfileId,
                  chargeDate: new Date().toISOString(),
                  planId: 'monthly',
                  isRecurring: true
                }
              });
              
            results.push({
              subscriptionId: subscription.id,
              success: true,
              transactionId: chargeResult.TranzactionId,
              nextPaymentDate: nextPaymentDate.toISOString()
            });
            logStep(`Successfully charged subscription ${subscription.id}`);
          } else {
            // Failed charge
            logStep(`Failed to charge subscription ${subscription.id}`, { 
              error: chargeResult.Description,
              code: chargeResult.ResponseCode 
            });
            
            // Log the failed payment
            await supabaseAdmin
              .from('user_payment_logs')
              .insert({
                user_id: subscription.user_id,
                subscription_id: subscription.id,
                token: subscription.token,
                amount: PLAN_PRICES.monthly,
                currency: 'ILS',
                status: 'payment_failed',
                payment_data: {
                  error: chargeResult.Description,
                  errorCode: chargeResult.ResponseCode,
                  chargeDate: new Date().toISOString(),
                  planId: 'monthly',
                  isRecurring: true,
                  failureCount: (subscription.payment_details?.failureCount || 0) + 1
                }
              });
            
            // Update subscription with failure count
            const failureCount = (subscription.payment_details?.failureCount || 0) + 1;
            await supabaseAdmin
              .from('user_subscriptions')
              .update({
                payment_details: {
                  ...subscription.payment_details,
                  failureCount,
                  lastFailureAt: new Date().toISOString(),
                  lastFailureReason: chargeResult.Description
                },
                // If too many failures, cancel the subscription
                status: failureCount >= 3 ? 'cancelled' : 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id);
            
            results.push({
              subscriptionId: subscription.id,
              success: false,
              error: chargeResult.Description,
              errorCode: chargeResult.ResponseCode,
              failureCount
            });
          }
        } catch (error) {
          logStep(`Error processing subscription ${subscription.id}`, { 
            error: error instanceof Error ? error.message : String(error)
          });
          results.push({
            subscriptionId: subscription.id,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: `Processed ${subscriptions.length} subscriptions`,
        results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    else if (action === 'cancel') {
      // Cancel subscription handler
      if (!subscriptionId) {
        return new Response(JSON.stringify({
          success: false,
          message: "Missing subscriptionId"
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      logStep(`Cancelling subscription ${subscriptionId}`);
      
      // Update subscription status to cancelled
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
        
      if (updateError) {
        logStep(`Error cancelling subscription ${subscriptionId}`, { error: updateError.message });
        throw new Error(`Failed to cancel subscription: ${updateError.message}`);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Subscription cancelled successfully"
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    else {
      return new Response(JSON.stringify({
        success: false,
        message: "Unknown action"
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: "Error processing recurring payment request",
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
