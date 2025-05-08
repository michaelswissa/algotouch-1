
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

// Helper function to log steps with timestamps
function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] ${step}${detailsStr}`);
}

// CardCom API configuration
const API_CONFIG = {
  TERMINAL: Deno.env.get('CARDCOM_TERMINAL'),
  USERNAME: Deno.env.get('CARDCOM_API_NAME'),
  PASSWORD: Deno.env.get('CARDCOM_API_PASSWORD'),
  BASE_URL: 'https://secure.cardcom.solutions/api/v11',
};

// Function to directly query CardCom API for payment status
async function verifyPaymentWithCardcomAPI(lowProfileId: string) {
  try {
    logStep("Directly querying CardCom API for payment status", { lowProfileId });
    
    // Validate required configuration
    if (!API_CONFIG.TERMINAL || !API_CONFIG.USERNAME || !API_CONFIG.PASSWORD) {
      throw new Error('Missing CardCom configuration. Please check environment variables.');
    }
    
    const payload = {
      TerminalNumber: parseInt(API_CONFIG.TERMINAL),
      ApiName: API_CONFIG.USERNAME,
      ApiPassword: API_CONFIG.PASSWORD,
      LowProfileId: lowProfileId
    };
    
    logStep("Calling CardCom GetLpResult API", { payload: { ...payload, ApiPassword: "***" } });
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/LowProfile/GetLpResult`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CardCom API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    logStep("CardCom API response received", { 
      responseCode: result.ResponseCode,
      description: result.Description,
      hasTransactionInfo: !!result.TranzactionInfo,
      hasTokenInfo: !!result.TokenInfo
    });
    
    return result;
  } catch (error) {
    logStep("Error verifying payment with CardCom API", { error: error.message });
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    
    // Create Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false }
      }
    );

    // Create client for authenticated user operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader || '' },
        },
      }
    );

    // Get current user if authenticated
    let userId = null;
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id;
      logStep("Authenticated user", { userId });
    }

    // Parse request body
    const { lowProfileId, source = 'unknown' } = await req.json();
    
    if (!lowProfileId) {
      throw new Error("Missing lowProfileId parameter");
    }

    logStep("Verifying payment", { lowProfileId, userId, source });

    // Check for payment in CardCom webhook records
    const { data: webhooks } = await supabaseAdmin
      .from('payment_webhooks')
      .select('*')
      .eq('processed', true)
      .contains('payload', { LowProfileId: lowProfileId })
      .order('created_at', { ascending: false })
      .limit(1);

    // If webhook found and processed successfully
    if (webhooks && webhooks.length > 0) {
      const webhook = webhooks[0];
      logStep("Found processed webhook", { webhookId: webhook.id });
      
      // Check if payment was successful
      const payload = webhook.payload;
      const isSuccessful = payload.ResponseCode === 0 || 
        (payload.TranzactionInfo && payload.TranzactionInfo.ResponseCode === 0);
      
      if (isSuccessful) {
        // Extract ReturnValue (userId) from the webhook
        const webhookUserId = payload.ReturnValue;
        
        // If the payment belongs to this user, ensure subscription is created
        if (userId && webhookUserId === userId) {
          logStep("Payment belongs to current user, checking subscription");
          
          // Check if user has an active subscription
          const { data: existingSubscription } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (!existingSubscription || existingSubscription.status === 'cancelled') {
            // Create a new subscription if none exists or if it was cancelled
            logStep("Creating/updating subscription for user", { userId });
            
            // Extract payment details from webhook
            const planId = payload.ProductName?.includes('Monthly') ? 'monthly' : 'annual';
            const amount = payload.TranzactionInfo?.Amount || payload.Amount || 0;
            
            // Extract payment method details
            let paymentMethod = null;
            if (payload.TranzactionInfo) {
              paymentMethod = {
                cardBrand: payload.TranzactionInfo.Brand || 'Unknown',
                lastFourDigits: payload.TranzactionInfo.Last4CardDigits?.toString() || '****',
                cardMonth: payload.TranzactionInfo.CardMonth,
                cardYear: payload.TranzactionInfo.CardYear
              };
            }
            
            // Calculate subscription periods
            const now = new Date();
            const thirtyDaysFromNow = new Date(now);
            thirtyDaysFromNow.setDate(now.getDate() + 30);
            
            // Calculate trial period only for monthly plans
            const isMonthlyPlan = planId === 'monthly';
            const trialEndsAt = isMonthlyPlan ? thirtyDaysFromNow.toISOString() : null;
            const currentPeriodEndsAt = thirtyDaysFromNow.toISOString();
            
            // Extract token info if present
            let tokenInfo = null;
            if (payload.TokenInfo) {
              tokenInfo = {
                token: payload.TokenInfo.Token,
                expiryDate: payload.TokenInfo.TokenExDate,
                cardMonth: payload.TokenInfo.CardMonth,
                cardYear: payload.TokenInfo.CardYear
              };
            }
            
            if (existingSubscription) {
              // Update existing subscription
              await supabaseAdmin
                .from('subscriptions')
                .update({
                  plan_type: planId,
                  status: isMonthlyPlan ? 'trial' : 'active',
                  trial_ends_at: trialEndsAt,
                  current_period_ends_at: currentPeriodEndsAt,
                  cancelled_at: null,
                  payment_method: paymentMethod,
                  token: tokenInfo?.token,
                  updated_at: now.toISOString()
                })
                .eq('id', existingSubscription.id);
            } else {
              // Create new subscription
              await supabaseAdmin
                .from('subscriptions')
                .insert({
                  user_id: userId,
                  plan_type: planId,
                  status: isMonthlyPlan ? 'trial' : 'active',
                  trial_ends_at: trialEndsAt,
                  current_period_ends_at: currentPeriodEndsAt,
                  payment_method: paymentMethod,
                  token: tokenInfo?.token,
                  created_at: now.toISOString(),
                  updated_at: now.toISOString()
                });
            }
            
            // Record payment in payment_logs if not already recorded
            const { data: existingLog } = await supabaseAdmin
              .from('payment_logs')
              .select('*')
              .eq('transaction_id', payload.TranzactionId.toString())
              .maybeSingle();
            
            if (!existingLog) {
              await supabaseAdmin
                .from('payment_logs')
                .insert({
                  user_id: userId,
                  plan_id: planId,
                  amount,
                  transaction_id: payload.TranzactionId.toString(),
                  payment_status: 'completed',
                  payment_data: payload,
                  currency: 'ILS'
                });
            }

            // If token was created, store it in recurring_payments table
            if (tokenInfo && !existingLog) {
              await supabaseAdmin
                .from('recurring_payments')
                .insert({
                  user_id: userId,
                  token: tokenInfo.token,
                  token_expiry: tokenInfo.expiryDate,
                  last_4_digits: payload.TranzactionInfo?.Last4CardDigits?.toString() || '****',
                  card_type: payload.TranzactionInfo?.Brand || 'Unknown',
                  token_approval_number: tokenInfo.TokenApprovalNumber,
                  status: 'active',
                  is_valid: true
                });
            }
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Payment verified successfully through webhook",
            paymentData: {
              transactionId: payload.TranzactionId,
              amount: payload.TranzactionInfo?.Amount || payload.Amount,
              planId: payload.ProductName?.includes('Monthly') ? 'monthly' : 'annual'
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Payment verification failed", 
            error: "Payment was not successful"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }
    
    // If no webhook record, check payment_sessions table
    const { data: paymentSession } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_id', lowProfileId)
      .eq('status', 'completed')
      .maybeSingle();
    
    if (paymentSession) {
      logStep("Found completed payment session", { sessionId: paymentSession.id });
      
      // If the session belongs to this user, ensure subscription is created
      if (userId && paymentSession.user_id === userId) {
        // Similar subscription creation logic as above
        logStep("Payment session belongs to current user");
        // Implementation would be similar to the webhook case
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment verified successfully via payment session" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // FALLBACK: If no payment record found, attempt direct check with Cardcom API
    logStep("No payment record found, attempting direct verification with CardCom API");
    
    try {
      // Call CardCom's GetLpResult API directly
      const cardcomResult = await verifyPaymentWithCardcomAPI(lowProfileId);
      
      // Check if payment was successful
      if (cardcomResult.ResponseCode === 0) {
        logStep("Payment verification successful with CardCom API", { 
          returnValue: cardcomResult.ReturnValue,
          transactionId: cardcomResult.TranzactionId 
        });
        
        // Extract user ID from ReturnValue
        const paymentUserId = cardcomResult.ReturnValue;
        
        // Verify this is a valid user ID
        if (!paymentUserId) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Missing user ID in payment data", 
              error: "No ReturnValue in CardCom response"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        
        // Store this webhook data to prevent duplicate processing
        await supabaseAdmin
          .from('payment_webhooks')
          .insert({
            webhook_type: 'cardcom_fallback',
            payload: cardcomResult,
            processed: true,
            processed_at: new Date().toISOString(),
            processing_result: { 
              success: true,
              userId: paymentUserId,
              source: 'fallback-verification'
            }
          });
        
        // Extract payment method details
        let paymentMethod = null;
        if (cardcomResult.TranzactionInfo) {
          paymentMethod = {
            cardBrand: cardcomResult.TranzactionInfo.Brand || 'Unknown',
            lastFourDigits: cardcomResult.TranzactionInfo.Last4CardDigits?.toString() || '****',
            cardMonth: cardcomResult.TranzactionInfo.CardMonth,
            cardYear: cardcomResult.TranzactionInfo.CardYear
          };
        }
        
        // Extract plan information
        const planId = cardcomResult.ProductName?.includes('Monthly') ? 'monthly' : 'annual';
        const amount = cardcomResult.TranzactionInfo?.Amount || cardcomResult.Amount || 0;
        
        // Calculate subscription periods
        const now = new Date();
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        
        // Calculate trial period only for monthly plans
        const isMonthlyPlan = planId === 'monthly';
        const trialEndsAt = isMonthlyPlan ? thirtyDaysFromNow.toISOString() : null;
        const currentPeriodEndsAt = thirtyDaysFromNow.toISOString();
        
        // Extract token info if present
        let tokenInfo = null;
        if (cardcomResult.TokenInfo) {
          tokenInfo = {
            token: cardcomResult.TokenInfo.Token,
            expiryDate: cardcomResult.TokenInfo.TokenExDate,
            cardMonth: cardcomResult.TokenInfo.CardMonth,
            cardYear: cardcomResult.TokenInfo.CardYear
          };
        }
        
        // Record this transaction in payment_logs if not already recorded
        const { data: existingLog } = await supabaseAdmin
          .from('payment_logs')
          .select('*')
          .eq('transaction_id', cardcomResult.TranzactionId.toString())
          .maybeSingle();
        
        if (!existingLog) {
          await supabaseAdmin
            .from('payment_logs')
            .insert({
              user_id: paymentUserId,
              plan_id: planId,
              amount,
              transaction_id: cardcomResult.TranzactionId.toString(),
              payment_status: 'completed',
              payment_data: cardcomResult,
              currency: 'ILS'
            });
        }
        
        // Update payment_sessions if one exists
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: 'completed',
            transaction_id: cardcomResult.TranzactionId.toString(),
            transaction_data: cardcomResult,
            updated_at: now.toISOString()
          })
          .eq('low_profile_id', lowProfileId)
          .eq('status', 'initiated');
        
        // Check if user has an active subscription
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('user_id', paymentUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!existingSubscription || existingSubscription.status === 'cancelled') {
          // Create or update subscription
          if (existingSubscription) {
            // Update existing subscription
            await supabaseAdmin
              .from('subscriptions')
              .update({
                plan_type: planId,
                status: isMonthlyPlan ? 'trial' : 'active',
                trial_ends_at: trialEndsAt,
                current_period_ends_at: currentPeriodEndsAt,
                cancelled_at: null,
                payment_method: paymentMethod,
                token: tokenInfo?.token,
                updated_at: now.toISOString()
              })
              .eq('id', existingSubscription.id);
          } else {
            // Create new subscription
            await supabaseAdmin
              .from('subscriptions')
              .insert({
                user_id: paymentUserId,
                plan_type: planId,
                status: isMonthlyPlan ? 'trial' : 'active',
                trial_ends_at: trialEndsAt,
                current_period_ends_at: currentPeriodEndsAt,
                payment_method: paymentMethod,
                token: tokenInfo?.token,
                created_at: now.toISOString(),
                updated_at: now.toISOString()
              });
          }
        }
        
        // If token was created, store it in recurring_payments table
        if (tokenInfo && !existingLog) {
          await supabaseAdmin
            .from('recurring_payments')
            .insert({
              user_id: paymentUserId,
              token: tokenInfo.token,
              token_expiry: tokenInfo.expiryDate,
              last_4_digits: cardcomResult.TranzactionInfo?.Last4CardDigits?.toString() || '****',
              card_type: cardcomResult.TranzactionInfo?.Brand || 'Unknown',
              token_approval_number: tokenInfo.TokenApprovalNumber,
              status: 'active',
              is_valid: true
            });
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Payment verified successfully via direct CardCom API check", 
            paymentData: {
              transactionId: cardcomResult.TranzactionId,
              amount,
              planId
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else {
        // Payment failed or still in progress
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Payment verification failed: ${cardcomResult.Description || 'Unknown error'}`,
            errorCode: cardcomResult.ResponseCode
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } catch (apiError: any) {
      logStep("Error during direct CardCom API verification", { error: apiError.message });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Error during CardCom API verification: ${apiError.message}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Error verifying payment: ${error.message}`,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
