
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'process-recurring';
    console.log(`[${functionName}] Starting recurring payments processing`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get active subscriptions that need processing (monthly and annual only)
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        next_charge_at,
        token,
        token_expires_ym,
        amount
      `)
      .in('plan_id', ['monthly', 'annual'])
      .eq('status', 'active')
      .lt('next_charge_at', new Date().toISOString())
      .not('token', 'is', null);

    if (subError) {
      throw subError;
    }

    console.log(`[${functionName}] Found ${subscriptions?.length || 0} subscriptions to process`);

    // Process each subscription
    if (subscriptions) {
      for (const subscription of subscriptions) {
        try {
          // Get plan details
          const { data: plan } = await supabaseAdmin
            .from('plans')
            .select('*')
            .eq('id', subscription.plan_id)
            .single();

          if (!plan) {
            console.error(`[${functionName}] Plan not found for subscription ${subscription.id}`);
            continue;
          }

          // Process the recurring payment using CardCom API
          const cardcomUrl = "https://secure.cardcom.solutions/api/v11/Transactions/ChargeToken";
          const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
          const apiName = Deno.env.get("CARDCOM_API_NAME");
          
          if (!terminalNumber || !apiName) {
            throw new Error("Missing CardCom configuration");
          }

          const response = await fetch(cardcomUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              TerminalNumber: terminalNumber,
              APIName: apiName,
              Token: subscription.token,
              Amount: plan.price,
              CoinId: 1,
              Language: "he",
              UniqTranId: `${Date.now()}-${subscription.id}`
            })
          });

          const result = await response.json();
          const isSuccess = result.ResponseCode === "0";

          // Update subscription based on payment result
          const now = new Date();
          const nextChargeDate = new Date(now);
          
          if (subscription.plan_id === 'monthly') {
            nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
          } else if (subscription.plan_id === 'annual') {
            nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
          }

          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: isSuccess ? 'active' : 'failed',
              next_charge_at: isSuccess ? nextChargeDate.toISOString() : null,
              updated_at: now.toISOString()
            })
            .eq('id', subscription.id);

          // Log the payment attempt
          await supabaseAdmin
            .from('user_payment_logs')
            .insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              token: subscription.token,
              amount: plan.price,
              status: isSuccess ? 'payment_success' : 'payment_failed',
              transaction_id: result.TransactionId,
              payment_data: result
            });

        } catch (error) {
          console.error(`[${functionName}] Error processing subscription ${subscription.id}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Recurring payments processed successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[PROCESS-RECURRING][ERROR] ${error.message}`);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
