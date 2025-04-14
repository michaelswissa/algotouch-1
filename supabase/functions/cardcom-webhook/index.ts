
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Received webhook callback from Cardcom');
    
    const webhookData = await req.json();
    console.log('Webhook data:', JSON.stringify(webhookData));
    
    // Check if this is a valid webhook notification
    if (!webhookData || !webhookData.LowProfileId) {
      throw new Error('Invalid webhook data: Missing LowProfileId');
    }
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check if we've already processed this payment
    const { data: existingPayment } = await supabaseClient
      .from('user_payment_logs')
      .select('id, status')
      .eq('token', webhookData.LowProfileId)
      .maybeSingle();
      
    if (existingPayment && existingPayment.status === 'completed') {
      console.log(`Payment ${webhookData.LowProfileId} has already been processed`);
      return new Response(
        JSON.stringify({ success: true, status: 'already_processed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if this is a successful transaction
    let isSuccessful = false;
    if (
      webhookData.OperationResponse === '0' ||
      webhookData.ResponseCode === 0 ||
      (webhookData.TranzactionInfo && webhookData.TranzactionInfo.ResponseCode === 0)
    ) {
      isSuccessful = true;
    }
    
    console.log(`Transaction status: ${isSuccessful ? 'Successful' : 'Failed'}`);
    
    // Check if this payment is associated with a payment session
    const { data: paymentSession } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .filter('payment_details->lowProfileId', 'eq', webhookData.LowProfileId)
      .maybeSingle();
      
    if (paymentSession) {
      console.log('Found associated payment session:', paymentSession.id);
      
      // Get user ID and plan ID
      const userId = paymentSession.user_id;
      const planId = paymentSession.payment_details?.planId || paymentSession.plan_id;
      
      if (isSuccessful) {
        console.log('Processing successful payment');
        
        if (userId) {
          // Get current date
          const now = new Date();
          
          // Prepare subscription data
          let subscriptionData: any = {
            user_id: userId,
            plan_type: planId,
            status: planId === 'monthly' ? 'trial' : 'active',
            payment_method: webhookData.UIValues || {},
            updated_at: now.toISOString()
          };
          
          // Set appropriate dates based on plan
          if (planId === 'monthly') {
            // Trial period - 1 month
            const trialEnd = new Date(now);
            trialEnd.setMonth(trialEnd.getMonth() + 1);
            subscriptionData.trial_ends_at = trialEnd.toISOString();
            subscriptionData.next_charge_date = trialEnd.toISOString();
          } else if (planId === 'annual') {
            // Annual subscription - 1 year
            const yearEnd = new Date(now);
            yearEnd.setFullYear(yearEnd.getFullYear() + 1);
            subscriptionData.current_period_ends_at = yearEnd.toISOString();
            subscriptionData.next_charge_date = yearEnd.toISOString();
          } else if (planId === 'vip') {
            // VIP subscription - lifetime
            subscriptionData.current_period_ends_at = null;
            subscriptionData.next_charge_date = null;
          }
          
          // Update or create subscription
          await supabaseClient
            .from('subscriptions')
            .upsert(subscriptionData);
            
          console.log('Subscription created/updated successfully');
        }
        
        // Record payment
        const paymentLogData = {
          user_id: userId,
          token: webhookData.LowProfileId,
          status: 'completed',
          amount: paymentSession.payment_details?.amount || webhookData.TranzactionInfo?.Amount || 0,
          approval_code: webhookData.TranzactionInfo?.ApprovalNumber || null,
          transaction_details: webhookData
        };

        if (existingPayment) {
          await supabaseClient
            .from('user_payment_logs')
            .update(paymentLogData)
            .eq('id', existingPayment.id);
        } else {
          await supabaseClient
            .from('user_payment_logs')
            .insert(paymentLogData);
        }
        
        console.log('Payment logged successfully');
      } else {
        // Failed payment
        console.log('Recording failed payment');
        
        // Record the failed payment
        const paymentLogData = {
          user_id: userId,
          token: webhookData.LowProfileId,
          status: 'failed',
          amount: paymentSession.payment_details?.amount || 0,
          transaction_details: webhookData
        };

        if (existingPayment) {
          await supabaseClient
            .from('user_payment_logs')
            .update(paymentLogData)
            .eq('id', existingPayment.id);
        } else {
          await supabaseClient
            .from('user_payment_logs')
            .insert(paymentLogData);
        }
        
        // Record payment error
        await supabaseClient.from('payment_errors').insert({
          user_id: userId || paymentSession.email,
          error_code: (webhookData.ResponseCode || webhookData.OperationResponse || '0').toString(),
          error_message: webhookData.Description || 'Unknown error',
          payment_details: {
            webhookData,
            paymentSession: paymentSession.id
          },
          context: 'webhook'
        });
      }
      
      // Mark the session as processed
      await supabaseClient
        .from('payment_sessions')
        .update({
          payment_details: {
            ...paymentSession.payment_details,
            status: isSuccessful ? 'completed' : 'failed',
            webhookProcessed: true,
            webhookData,
            processedAt: new Date().toISOString()
          },
          expires_at: new Date().toISOString()
        })
        .eq('id', paymentSession.id);
        
      console.log(`Payment session ${paymentSession.id} marked as ${isSuccessful ? 'completed' : 'failed'}`);
    } else {
      // No associated payment session found
      console.log('No payment session found for lowProfileId:', webhookData.LowProfileId);
      
      // Still record the webhook data
      await supabaseClient.from('user_payment_logs').insert({
        token: webhookData.LowProfileId,
        status: isSuccessful ? 'completed' : 'failed',
        amount: webhookData.TranzactionInfo?.Amount || 0,
        transaction_details: webhookData
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Always return 200 to Cardcom to acknowledge receipt
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Always return 200 even on error to acknowledge receipt
      }
    );
  }
});
