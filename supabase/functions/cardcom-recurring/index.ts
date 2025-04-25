
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
const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD") || "i9nr6caGbgheTdYfQbo6";
const cardcomUrl = "https://secure.cardcom.solutions";

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-RECURRING] ${step}${detailsStr}`);
};

// Add a function to validate token before charging
async function validateTokenBeforeCharge(token: string, supabaseAdmin: any) {
  try {
    // Check if token exists and is valid in recurring_payments table
    const { data, error } = await supabaseAdmin
      .from('recurring_payments')
      .select('is_valid, token_expiry')
      .eq('token', token)
      .eq('status', 'active')
      .single();
    
    if (error || !data) {
      console.error('Token validation error:', error);
      return false;
    }
    
    // Check if token is marked as valid
    if (!data.is_valid) {
      return false;
    }
    
    // Check if token is expired
    if (data.token_expiry) {
      const expiryDate = new Date(data.token_expiry);
      const currentDate = new Date();
      if (expiryDate < currentDate) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// Format date to YYYYMMDD format for CardCom
function formatTokenExpiryDate(year: string, month: string): string {
  // Ensure we have 2-digit month and add 20 to year (assuming 2-digit year)
  const formattedMonth = month.padStart(2, '0');
  const formattedYear = (year.length === 2) ? `20${year}` : year;
  return `${formattedYear}${formattedMonth}01`; // First day of expiry month
}

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
    
    // Parse request payload
    const { action, subscriptionId, amount } = await req.json();
    
    if (!action) {
      throw new Error("Missing required parameter: action");
    }
    
    logStep("Processing request", { action, subscriptionId });
    
    // Different actions based on the request
    switch (action) {
      case 'charge': {
        // Charge a subscription using saved token
        if (!subscriptionId) {
          throw new Error("Missing required parameter: subscriptionId");
        }
        
        // Get subscription data
        const { data: subscription, error: subscriptionError } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();
        
        if (subscriptionError || !subscription) {
          throw new Error("Subscription not found");
        }
        
        if (subscription.user_id !== user.id) {
          throw new Error("Unauthorized access to subscription");
        }
        
        // Get payment method
        const paymentMethod = subscription.payment_method as any;
        if (!paymentMethod?.token) {
          throw new Error("No payment method found for this subscription");
        }

        // Validate token before processing
        const isTokenValid = await validateTokenBeforeCharge(paymentMethod.token, supabaseAdmin);
        
        if (!isTokenValid) {
          throw new Error('Token is invalid or expired');
        }
        
        // Calculate charge amount based on plan type
        let chargeAmount = 0;
        if (subscription.plan_type === 'monthly') {
          chargeAmount = 371.00;
        } else if (subscription.plan_type === 'annual') {
          chargeAmount = 3371.00;
        } else {
          throw new Error("Invalid plan type for recurring charge");
        }
        
        // Override amount if provided
        if (amount) {
          chargeAmount = Number(amount);
        }
        
        logStep("Preparing to charge token", { 
          token: paymentMethod.token.substring(0, 8) + '...',
          amount: chargeAmount,
          planType: subscription.plan_type 
        });
        
        // Prepare URL-encoded form data
        const params = new URLSearchParams({
          TerminalNumber: terminalNumber,
          UserName: apiName,
          TokenToCharge_Token: paymentMethod.token,
          TokenToCharge_CardValidityMonth: paymentMethod.expiryMonth || '',
          TokenToCharge_CardValidityYear: paymentMethod.expiryYear || '',
          TokenToCharge_SumToBill: chargeAmount.toString(),
          TokenToCharge_APILevel: '10',
          TokenToCharge_CoinID: '1', // ILS
          TokenToCharge_ProductName: `מנוי ${subscription.plan_type === 'monthly' ? 'חודשי' : 'שנתי'}`,
          TokenToCharge_UserPassword: apiPassword,
          TokenToCharge_IsRecurringPayment: 'true'
        });
        
        // Call CardCom API to charge the token
        const response = await fetch(`${cardcomUrl}/Interface/ChargeToken.aspx`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });
        
        // Parse response
        const responseText = await response.text();
        const responseData = new URLSearchParams(responseText);
        
        const responseCode = responseData.get('ResponseCode');
        const internalDealNumber = responseData.get('InternalDealNumber');
        
        logStep("CardCom charge response", { 
          responseCode,
          internalDealNumber,
          responseText
        });
        
        if (responseCode !== '0') {
          throw new Error(`Failed to charge subscription: ${responseData.get('Description') || 'Unknown error'}`);
        }
        
        // Update subscription with new billing period
        const now = new Date();
        let nextChargeDate = new Date();
        let currentPeriodEndsAt = new Date();
        
        if (subscription.plan_type === 'monthly') {
          nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
          currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
        } else if (subscription.plan_type === 'annual') {
          nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
          currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
        }
        
        // Update subscription status
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            trial_ends_at: null, // No longer in trial
            next_charge_date: nextChargeDate.toISOString(),
            current_period_ends_at: currentPeriodEndsAt.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', subscriptionId);
        
        // Log payment
        await supabaseAdmin
          .from('payment_logs')
          .insert({
            user_id: subscription.user_id,
            transaction_id: internalDealNumber || '',
            amount: chargeAmount,
            currency: 'ILS',
            plan_id: subscription.plan_type,
            payment_status: 'succeeded',
            payment_data: Object.fromEntries(responseData.entries())
          });
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription charged successfully",
            data: {
              transactionId: internalDealNumber,
              amount: chargeAmount,
              nextChargeDate: nextChargeDate.toISOString()
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      case 'cancel': {
        // Cancel a subscription
        if (!subscriptionId) {
          throw new Error("Missing required parameter: subscriptionId");
        }
        
        // Get subscription data
        const { data: subscription, error: subscriptionError } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();
        
        if (subscriptionError || !subscription) {
          throw new Error("Subscription not found");
        }
        
        if (subscription.user_id !== user.id) {
          throw new Error("Unauthorized access to subscription");
        }
        
        logStep("Cancelling subscription", { subscriptionId });
        
        // Update subscription status to cancelled
        const now = new Date();
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', subscriptionId);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription cancelled successfully",
            data: {
              subscriptionId,
              currentPeriodEndsAt: subscription.current_period_ends_at
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      case 'update-payment-method': {
        // Update payment method for a subscription
        if (!subscriptionId) {
          throw new Error("Missing required parameter: subscriptionId");
        }
        
        // This would typically redirect to a payment page to collect new payment details
        // For now, we'll just return instructions
        return new Response(
          JSON.stringify({
            success: true,
            message: "To update payment method, please go through the payment process again",
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Operation failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
