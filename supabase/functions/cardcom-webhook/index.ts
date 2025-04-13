
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.3";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

// Process payment and update subscription
async function processPayment(webhookData: any) {
  // Extract data from webhook
  const userId = webhookData.ReturnValue;
  const transactionId = webhookData.TranzactionInfo?.TranzactionId;
  const lowProfileId = webhookData.LowProfileId;
  let paymentSession = null;
  
  try {
    // Check for duplicate transaction processing
    const { data: existingTransaction } = await supabase
      .from("user_payment_logs")
      .select("*")
      .eq("transaction_details->transaction_id", transactionId)
      .maybeSingle();
      
    if (existingTransaction) {
      console.log(`Transaction ${transactionId} has already been processed, skipping.`);
      return;
    }

    // Find the payment session
    const { data: session } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("payment_details->lowProfileId", lowProfileId)
      .maybeSingle();
    
    if (session) {
      console.log(`Found payment session for lowProfileId ${lowProfileId}:`, session);
      paymentSession = session;
    } else {
      console.warn('No payment session found for lowProfileId:', lowProfileId);
    }
    
    // Extract plan information and user details
    const planId = paymentSession?.plan_id || 'monthly';
    const sessionUserId = paymentSession?.user_id || userId;
    const amount = paymentSession?.payment_details?.amount || 
                   webhookData.TranzactionInfo?.Amount || 0;
    
    if (!sessionUserId) {
      console.error('No user ID found for this transaction');
      return;
    }

    // Update user subscription based on plan
    const now = new Date();
    let periodEndsAt = null;
    const trialEndsAt = planId === 'monthly' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
    
    if (planId === 'annual') {
      periodEndsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }
    
    const status = planId === 'monthly' ? 'trial' : 'active';
    
    // Update the user's subscription
    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: sessionUserId,
        plan_type: planId,
        status: status,
        current_period_ends_at: periodEndsAt?.toISOString(),
        trial_ends_at: trialEndsAt?.toISOString(),
        payment_method: {
          type: "cardcom",
          lastFourDigits: webhookData.TranzactionInfo.Last4CardDigitsString || "",
          brand: webhookData.TranzactionInfo.Brand || ""
        },
        contract_signed: true,
        contract_signed_at: now.toISOString()
      });
      
    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
    } else {
      console.log('Subscription updated successfully');
    }
    
    // Record the payment in the payment_history table
    const { error: paymentError } = await supabase
      .from("payment_history")
      .insert({
        user_id: sessionUserId,
        subscription_id: sessionUserId, // Using user_id as subscription_id
        amount: amount,
        currency: "ILS",
        status: "completed",
        payment_method: {
          type: "cardcom",
          lastFourDigits: webhookData.TranzactionInfo.Last4CardDigitsString || "",
          brand: webhookData.TranzactionInfo.Brand || "",
          transaction_id: transactionId.toString()
        }
      });
      
    if (paymentError) {
      console.error('Error recording payment history:', paymentError);
    } else {
      console.log('Payment history recorded successfully');
    }
    
    // Log transaction details
    await supabase
      .from("user_payment_logs")
      .insert({
        user_id: sessionUserId,
        amount: amount,
        status: "completed",
        token: lowProfileId,
        approval_code: webhookData.TranzactionInfo.ApprovalNumber || "",
        transaction_details: {
          transaction_id: transactionId,
          plan_id: planId,
          timestamp: new Date().toISOString(),
          card_last_four: webhookData.TranzactionInfo.Last4CardDigitsString || "",
          is_3ds_verified: !!webhookData.TranzactionInfo.CardNumberEntryMode?.includes("3DS"),
          payment_method: {
            type: "credit_card",
            brand: webhookData.TranzactionInfo.Brand || "",
            last4: webhookData.TranzactionInfo.Last4CardDigitsString || ""
          }
        }
      });
      
    // Update payment session
    if (paymentSession) {
      await supabase
        .from("payment_sessions")
        .update({ 
          expires_at: new Date().toISOString(), // Expire the session immediately
          payment_details: { 
            ...paymentSession.payment_details,
            status: 'completed',
            completed_at: new Date().toISOString(),
            transaction_id: transactionId
          } 
        })
        .eq('id', paymentSession.id);
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Received webhook request from CardCom');
    
    // Parse the webhook payload
    const webhookData = await req.json();
    console.log('Webhook payload:', JSON.stringify(webhookData));
    
    if (!webhookData) {
      throw new Error('No webhook data received');
    }
    
    // Check if the transaction was successful
    if (webhookData.ResponseCode === 0 && webhookData.TranzactionInfo?.TranzactionId) {
      console.log('Transaction successful:', webhookData.TranzactionInfo.TranzactionId);
      
      // Process the transaction in the background without awaiting
      const backgroundPromise = processPayment(webhookData);
      
      // Use EdgeRuntime.waitUntil for background processing if available
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(backgroundPromise);
      } else {
        // For environments without waitUntil, we still want to process
        // but we won't wait for it to complete
        backgroundPromise.catch(err => {
          console.error('Background payment processing error:', err);
        });
      }
    } else if (webhookData.ResponseCode !== 0) {
      console.error('Transaction failed:', webhookData.Description);
      
      // Log the failed transaction if we have a lowProfileId
      if (webhookData.LowProfileId) {
        const { data: paymentSession } = await supabase
          .from("payment_sessions")
          .select("*")
          .eq("payment_details->lowProfileId", webhookData.LowProfileId)
          .maybeSingle();
        
        if (paymentSession && paymentSession.user_id) {
          await supabase
            .from("payment_errors")
            .insert({
              user_id: paymentSession.user_id,
              error_code: webhookData.ResponseCode.toString(),
              error_message: webhookData.Description || "Unknown error",
              context: "webhook",
              payment_details: {
                lowProfileId: webhookData.LowProfileId,
                plan_id: paymentSession.plan_id
              }
            });
        }
      }
    }
    
    // Always respond with a success status to CardCom to prevent retries
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Even on error, return a success response to CardCom to prevent retries
    return new Response(
      JSON.stringify({ 
        success: true,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Always return 200 to CardCom
      }
    );
  }
});
