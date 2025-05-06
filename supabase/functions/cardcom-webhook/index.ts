
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    console.log("[CARDCOM-WEBHOOK] Received webhook");
    
    // Get webhook data
    let webhookData;
    try {
      webhookData = await req.json();
      console.log("[CARDCOM-WEBHOOK] Webhook data:", JSON.stringify(webhookData));
    } catch (e) {
      console.error("[CARDCOM-WEBHOOK] Error parsing webhook body:", e);
      return new Response("Error parsing request body", { status: 400 });
    }
    
    // Extract necessary data
    const { 
      ResponseCode, LowProfileId, TranzactionId, ReturnValue, 
      TokenInfo, TranzactionInfo
    } = webhookData;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[CARDCOM-WEBHOOK] Missing Supabase configuration");
      return new Response("Server configuration error", { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Find the payment session by LowProfileId
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_id', LowProfileId)
      .maybeSingle();
      
    if (sessionError) {
      console.error("[CARDCOM-WEBHOOK] Error finding session:", sessionError);
      return new Response("Error finding session", { status: 500 });
    }
    
    if (!session) {
      console.error("[CARDCOM-WEBHOOK] Session not found for LowProfileId:", LowProfileId);
      return new Response("Session not found", { status: 404 });
    }
    
    // Determine payment status
    let status = 'processing';
    let transaction_id = null;
    let token = null;
    let token_expiry = null;
    
    // Check operation success
    if (ResponseCode === 0) {
      status = 'success';
      
      // Store token info if available
      if (TokenInfo) {
        token = TokenInfo.Token;
        token_expiry = TokenInfo.TokenExDate;
      }
      
      // Store transaction info if available
      if (TranzactionInfo) {
        transaction_id = TranzactionInfo.TranzactionId;
      }
    } else {
      status = 'failed';
    }
    
    // Update session status in database
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({
        status,
        transaction_id,
        card_token: token,
        token_expiry,
        webhook_data: webhookData,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id);
      
    if (updateError) {
      console.error("[CARDCOM-WEBHOOK] Error updating session:", updateError);
      return new Response("Error updating session", { status: 500 });
    }
    
    // If successful, and we have a user ID, update user subscription
    if (status === 'success' && session.user_id) {
      const now = new Date();
      let expiryDate = new Date();
      
      // Set subscription end date based on plan
      if (session.plan_id === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (session.plan_id === 'annual') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else if (session.plan_id === 'vip') {
        // VIP is "lifetime" - set to far future date
        expiryDate.setFullYear(expiryDate.getFullYear() + 100);
      }
      
      // Update user subscription
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: session.user_id,
          plan_id: session.plan_id,
          status: 'active',
          start_date: now.toISOString(),
          end_date: expiryDate.toISOString(),
          card_token: token,
          token_expiry,
          last_payment_id: session.id
        });
        
      if (subscriptionError) {
        console.error("[CARDCOM-WEBHOOK] Error updating subscription:", subscriptionError);
        // Continue - still return success to CardCom
      }
      
      // Update user role to subscriber
      const { error: userRoleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: session.user_id,
          role: 'subscriber',
          updated_at: now.toISOString()
        });
        
      if (userRoleError) {
        console.error("[CARDCOM-WEBHOOK] Error updating user role:", userRoleError);
        // Continue - still return success to CardCom
      }
    }
    
    console.log("[CARDCOM-WEBHOOK] Successfully processed webhook");
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("[CARDCOM-WEBHOOK] Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
});
