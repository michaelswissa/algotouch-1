
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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
      
      // Extract user ID from ReturnValue if passed during payment initialization
      const userId = webhookData.ReturnValue;
      const transactionId = webhookData.TranzactionInfo.TranzactionId;
      const lowProfileId = webhookData.LowProfileId;
      
      // Find the payment session
      const { data: paymentSession } = await supabase
        .from("payment_sessions")
        .select("*")
        .eq("payment_details->lowProfileId", lowProfileId)
        .maybeSingle();
      
      if (paymentSession) {
        console.log(`Found payment session for lowProfileId ${lowProfileId}:`, paymentSession);
        
        // Extract plan information and user details
        const planId = paymentSession.plan_id;
        const sessionUserId = paymentSession.user_id || userId;
        const amount = paymentSession.payment_details?.amount || 0;
        
        if (sessionUserId) {
          // Update user subscription based on plan
          const now = new Date();
          let periodEndsAt = null;
          let nextChargeDate = null;
          const trialEndsAt = planId === 'monthly' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
          
          if (planId === 'annual') {
            periodEndsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            nextChargeDate = new Date(periodEndsAt);
          } else if (planId === 'monthly' && trialEndsAt) {
            // For monthly plan, next charge is after trial
            nextChargeDate = new Date(trialEndsAt);
          }
          
          const status = planId === 'monthly' ? 'trial' : 'active';
          
          // Extract payment method details from the transaction
          const paymentMethod = {
            type: "cardcom",
            lastFourDigits: webhookData.TranzactionInfo.Last4CardDigitsString || "",
            expiryMonth: (webhookData.UIValues?.CardMonth || "").toString().padStart(2, '0'),
            expiryYear: (webhookData.UIValues?.CardYear || "").toString(),
            brand: webhookData.TranzactionInfo.Brand || "",
            cardholderName: webhookData.UIValues?.CardOwnerName || ""
          };
          
          // Check if user already has a subscription
          const { data: existingSubscription } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", sessionUserId)
            .maybeSingle();
            
          if (existingSubscription) {
            console.log('User already has subscription, updating:', existingSubscription.id);
            
            // Update existing subscription
            const { error: subscriptionError } = await supabase
              .from("subscriptions")
              .update({
                plan_type: planId,
                status: status,
                current_period_ends_at: periodEndsAt?.toISOString(),
                next_charge_date: nextChargeDate?.toISOString(),
                trial_ends_at: trialEndsAt?.toISOString(),
                payment_method: paymentMethod,
                contract_signed: true,
                contract_signed_at: now.toISOString(),
                updated_at: now.toISOString()
              })
              .eq("id", existingSubscription.id);
              
            if (subscriptionError) {
              console.error('Error updating subscription:', subscriptionError);
            } else {
              console.log('Subscription updated successfully');
            }
          } else {
            console.log('Creating new subscription for user:', sessionUserId);
            
            // Create new subscription
            const { error: subscriptionError } = await supabase
              .from("subscriptions")
              .insert({
                user_id: sessionUserId,
                plan_type: planId,
                status: status,
                current_period_ends_at: periodEndsAt?.toISOString(),
                next_charge_date: nextChargeDate?.toISOString(),
                trial_ends_at: trialEndsAt?.toISOString(),
                payment_method: paymentMethod,
                contract_signed: true,
                contract_signed_at: now.toISOString()
              });
              
            if (subscriptionError) {
              console.error('Error creating subscription:', subscriptionError);
            } else {
              console.log('Subscription created successfully');
            }
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
                last4: webhookData.TranzactionInfo.Last4CardDigitsString || "",
                brand: webhookData.TranzactionInfo.Brand || "",
                transaction_id: transactionId.toString(),
                expiryMonth: (webhookData.UIValues?.CardMonth || "").toString().padStart(2, '0'),
                expiryYear: (webhookData.UIValues?.CardYear || "").toString()
              },
              payment_date: now.toISOString()
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
                  last4: webhookData.TranzactionInfo.Last4CardDigitsString || "",
                  expiryMonth: (webhookData.UIValues?.CardMonth || "").toString().padStart(2, '0'),
                  expiryYear: (webhookData.UIValues?.CardYear || "").toString()
                },
                UIValues: webhookData.UIValues || {}
              }
            });
            
          // Mark payment session as processed
          await supabase
            .from("payment_sessions")
            .update({ 
              payment_details: { 
                ...paymentSession.payment_details,
                processed: true,
                transaction_id: transactionId,
                processed_at: now.toISOString()
              } 
            })
            .eq("id", paymentSession.id);
        }
      } else {
        console.warn('No payment session found for lowProfileId:', lowProfileId);
        
        // Try to find based on userId if provided
        if (userId) {
          console.log('Trying to create subscription based on userId:', userId);
          const transactionInfo = webhookData.TranzactionInfo;
          const uiValues = webhookData.UIValues || {};
          
          // Create default payment method
          const paymentMethod = {
            type: "cardcom",
            lastFourDigits: transactionInfo.Last4CardDigitsString || "",
            expiryMonth: (uiValues.CardMonth || "").toString().padStart(2, '0'),
            expiryYear: (uiValues.CardYear || "").toString(),
            brand: transactionInfo.Brand || ""
          };
          
          // Default to monthly plan if we don't know
          const planId = 'monthly';
          const now = new Date();
          const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          // Create subscription directly
          const { error: subscriptionError } = await supabase
            .from("subscriptions")
            .upsert({
              user_id: userId,
              plan_type: planId,
              status: 'trial',
              trial_ends_at: trialEndsAt.toISOString(),
              next_charge_date: trialEndsAt.toISOString(),
              payment_method: paymentMethod,
              contract_signed: true,
              contract_signed_at: now.toISOString()
            });
            
          if (subscriptionError) {
            console.error('Error creating fallback subscription:', subscriptionError);
          } else {
            console.log('Fallback subscription created successfully');
          }
        }
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
