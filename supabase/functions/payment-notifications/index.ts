
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, payment_id, status, email, plan_id, timestamp } = await req.json();

    if (!user_id || !payment_id || !status) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 400 }
      );
    }

    console.log(`Processing payment notification for user ${user_id}, payment ${payment_id}, status: ${status}`);

    // Handle payment success
    if (status === 'completed') {
      // Update the webhook_event as processed
      await supabaseAdmin
        .from('webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('source_id', payment_id)
        .eq('event_type', 'status_change');

      // For token_only operations, we just record the token but don't activate subscription yet
      // This is for monthly plans where we create a token first
      const { data: session } = await supabaseAdmin
        .from('payment_sessions')
        .select('*')
        .eq('id', payment_id)
        .single();

      if (session?.transaction_data?.operation === 'CreateTokenOnly' || plan_id === 'monthly') {
        console.log("Token created for monthly plan, not activating subscription yet");
        // Here we would save the token for future use
      } else {
        // For immediate payment operations, activate the subscription
        console.log("Payment complete, activating subscription");
        
        // Check if there's an existing subscription to update
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('user_id', user_id)
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'active',
              plan_type: plan_id,
              payment_status: 'success',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.id);
        } else {
          // Create new subscription
          await supabaseAdmin
            .from('subscriptions')
            .insert({
              user_id,
              plan_type: plan_id,
              status: 'active',
              payment_status: 'success'
            });
        }
      }
      
      // Log successful payment processing
      await supabaseAdmin
        .from('user_payment_logs')
        .insert({
          user_id,
          token: payment_id,
          amount: session?.amount || 0,
          status: 'payment_processed',
          payment_data: { payment_id, notification_time: timestamp }
        });
    }
    
    // Handle payment failure
    else if (status === 'failed') {
      console.log("Payment failed, updating records");
      
      // Update webhook as processed
      await supabaseAdmin
        .from('webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('source_id', payment_id)
        .eq('event_type', 'status_change');
        
      // Log the failure
      await supabaseAdmin
        .from('user_payment_logs')
        .insert({
          user_id,
          token: payment_id,
          amount: 0,
          status: 'payment_failed',
          payment_data: { payment_id, error_time: timestamp }
        });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 }
    );
  } catch (error) {
    console.error("Error handling payment notification:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
    );
  }
});
