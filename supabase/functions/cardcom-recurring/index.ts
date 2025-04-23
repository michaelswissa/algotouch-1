
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
    
    const { action, token, planType, tokenExpiryDate, lastFourDigits, nextChargeDate } = await req.json();
    
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
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: "שגיאה בהגדרת תשלום מחזורי",
        error: errorMessage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
