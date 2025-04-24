
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CARDCOM_API_BASE = "https://secure.cardcom.solutions/api/v11";
const CARDCOM_TERMINAL_NUMBER = 160138;
const CARDCOM_API_NAME = "bLaocQRMSnwphQRUVG3b";
const CARDCOM_API_PASSWORD = "i9nr6caGbgheTdYfQbo6";
const CARDCOM_SUCCESS_URL = "https://algotouch.lovable.app/payment/success";
const CARDCOM_FAILED_URL = "https://algotouch.lovable.app/payment/failed";
const CARDCOM_WEBHOOK_URL = "https://algotouch.lovable.app/api/cardcom-webhook";

// Configure CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  token: string;
  status: string;
  created_at: string;
  next_charge_date: string;
  user_email: string;
  user_full_name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "checkAndCharge";
    console.log(`Running cardcom-recurring function with action: ${action}`);

    // Get Supabase client from request
    const supabaseClient = createClient(req);

    // Implement different actions
    switch (action) {
      case "checkAndCharge":
        return await handleCheckAndCharge(req, supabaseClient);
      case "chargeSubscription":
        return await handleChargeSubscription(req, supabaseClient);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in cardcom-recurring function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper to create a Supabase client
function createClient(req: Request) {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );
  
  return supabaseClient;
}

// Handler for checkAndCharge action - finds subscriptions that need charging
async function handleCheckAndCharge(req: Request, supabaseClient: any) {
  console.log("Checking for subscriptions to charge");
  
  // Query subscriptions that need to be charged (next_charge_date <= now)
  const { data: subscriptions, error } = await supabaseClient
    .from("subscriptions")
    .select("*, users(email, full_name)")
    .eq("status", "active")
    .lte("next_charge_date", new Date().toISOString())
    .limit(50);
  
  if (error) {
    console.error("Error querying subscriptions:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  console.log(`Found ${subscriptions.length} subscriptions to charge`);
  
  // Process each subscription
  const results = [];
  for (const subscription of subscriptions) {
    try {
      const result = await chargeSubscription(subscription, supabaseClient);
      results.push(result);
    } catch (error) {
      console.error(`Error charging subscription ${subscription.id}:`, error);
      results.push({ subscription_id: subscription.id, error: error.message });
    }
  }
  
  return new Response(JSON.stringify({ success: true, results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Handler for chargeSubscription action - charges a specific subscription
async function handleChargeSubscription(req: Request, supabaseClient: any) {
  try {
    const { subscription_id } = await req.json();
    
    if (!subscription_id) {
      throw new Error("Missing subscription_id parameter");
    }
    
    // Get the subscription
    const { data: subscription, error } = await supabaseClient
      .from("subscriptions")
      .select("*, users(email, full_name)")
      .eq("id", subscription_id)
      .single();
    
    if (error || !subscription) {
      throw new Error(`Subscription not found: ${error?.message}`);
    }
    
    const result = await chargeSubscription(subscription, supabaseClient);
    
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handleChargeSubscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Core function to charge a subscription using CardCom API
async function chargeSubscription(subscription: Subscription, supabaseClient: any) {
  console.log(`Processing subscription ${subscription.id} for user ${subscription.user_id}`);
  
  // Determine amount based on plan
  let amount = subscription.plan_id === "monthly" ? 371 : 
               subscription.plan_id === "annual" ? 3371 : 13121;
  
  const planNames: Record<string, string> = {
    'monthly': 'מנוי חודשי',
    'annual': 'מנוי שנתי',
    'vip': 'מנוי VIP'
  };
  
  // Use the user information for the charge
  const userEmail = subscription.user_email || subscription.users?.email; 
  const userFullName = subscription.user_full_name || subscription.users?.full_name;
  
  if (!userEmail) {
    throw new Error("Missing user email for charging subscription");
  }
  
  // Create CardCom payment payload
  const payload = {
    TerminalNumber: CARDCOM_TERMINAL_NUMBER,
    ApiName: CARDCOM_API_NAME,
    Operation: "ChargeAndCreateToken", // Always create a new token for next charge
    ReturnValue: `recurring-${subscription.id}-${Date.now()}`,
    Amount: amount.toString(),
    SuccessRedirectUrl: CARDCOM_SUCCESS_URL,
    FailedRedirectUrl: CARDCOM_FAILED_URL,
    WebHookUrl: CARDCOM_WEBHOOK_URL,
    ProductName: planNames[subscription.plan_id] || "מנוי",
    Language: "he",
    ISOCoinId: 1,
    Document: {
      Name: userFullName || userEmail,
      Email: userEmail,
      Products: [{
        Description: planNames[subscription.plan_id] || "מנוי חודשי",
        UnitCost: amount.toString(),
        Quantity: 1
      }]
    },
    Token: subscription.token // Use the stored token for charging
  };
  
  // Call CardCom API
  const response = await fetch(`${CARDCOM_API_BASE}/LowProfile/Create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`CardCom API error: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.ResponseCode !== 0) {
    throw new Error(`CardCom error: ${result.Description}`);
  }
  
  // Update subscription with new token and next charge date
  const nextChargeDate = new Date();
  nextChargeDate.setMonth(nextChargeDate.getMonth() + 1); // Next charge in 1 month
  
  const { error: updateError } = await supabaseClient
    .from("subscriptions")
    .update({
      token: result.TokenInfo?.Token || subscription.token, // Update to new token if provided
      last_charge_date: new Date().toISOString(),
      next_charge_date: nextChargeDate.toISOString(),
      last_charge_amount: amount,
      charge_count: subscription.charge_count ? subscription.charge_count + 1 : 1
    })
    .eq("id", subscription.id);
  
  if (updateError) {
    console.error("Error updating subscription:", updateError);
    throw new Error(`Failed to update subscription: ${updateError.message}`);
  }
  
  // Create transaction record
  const { error: transactionError } = await supabaseClient
    .from("payment_transactions")
    .insert({
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      amount: amount,
      status: "completed",
      provider: "cardcom",
      transaction_id: result.TranzactionId?.toString(),
      transaction_data: result
    });
  
  if (transactionError) {
    console.error("Error creating transaction record:", transactionError);
  }
  
  return {
    subscription_id: subscription.id,
    user_id: subscription.user_id,
    transaction_id: result.TranzactionId,
    amount: amount,
    success: true,
    next_charge_date: nextChargeDate.toISOString()
  };
}
