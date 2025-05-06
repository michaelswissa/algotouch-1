import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for cross-domain requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Helper function to log steps and data
function logStep(functionName: string, step: string, data: any = {}) {
  console.log(`[${functionName}][${step}]`, JSON.stringify(data));
}

// Helper function to sanitize payment data for storage (PCI compliance)
function sanitizePaymentData(data: any): any {
  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Remove full card number if present (keep only last 4 digits)
  if (sanitized.CardNumber) {
    const last4 = sanitized.CardNumber.slice(-4);
    sanitized.CardNumber = `****${last4}`;
  }
  
  // Ensure we only keep last 4 digits for any card number fields
  if (sanitized.TranzactionInfo?.CardNumber) {
    const last4 = sanitized.TranzactionInfo.CardNumber.slice(-4);
    sanitized.TranzactionInfo.CardNumber = `****${last4}`;
  }
  
  // Remove CVV if present
  if (sanitized.CVV) {
    sanitized.CVV = '***';
  }
  if (sanitized.CVV2) {
    sanitized.CVV2 = '***';
  }
  
  return sanitized;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("CARDCOM-WEBHOOK", "Function started", {});
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let paymentData;
    try {
      paymentData = await req.json();
    } catch (error) {
      logStep("CARDCOM-WEBHOOK", "Error parsing request body", {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid JSON body' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log truncated webhook data for debugging (without sensitive information)
    const logSafeData = {
      ResponseCode: paymentData.ResponseCode,
      ReturnValue: paymentData.ReturnValue,
      TranzactionId: paymentData.TranzactionId,
      OperationType: paymentData.Operation,
      hasTokenInfo: Boolean(paymentData.TokenInfo),
      hasUIValues: Boolean(paymentData.UIValues)
    };
    
    logStep("CARDCOM-WEBHOOK", "Received webhook notification", logSafeData);
    
    // Extract key information
    const responseCode = paymentData.ResponseCode;
    const sessionId = paymentData.ReturnValue; // We stored the session ID in ReturnValue
    
    if (!sessionId) {
      logStep("CARDCOM-WEBHOOK", "Missing session ID in webhook data", {});
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing session ID in webhook data' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update the payment session status based on the response code
    const status = responseCode === 0 ? 'completed' : 'failed';
    
    // Sanitize payment data before storage to ensure PCI compliance
    const sanitizedPaymentData = sanitizePaymentData(paymentData);
    
    logStep("CARDCOM-WEBHOOK", "Updating session status", {
      sessionId,
      status,
      responseCode: responseCode?.toString(),
      hasTokenInfo: Boolean(sanitizedPaymentData.TokenInfo),
      tokenExpiryDate: sanitizedPaymentData.TokenInfo?.TokenExDate || null
    });
    
    const { error: updateError } = await supabaseAdmin
      .from('payment_sessions')
      .update({
        status,
        transaction_id: sanitizedPaymentData.TranzactionId?.toString(),
        response_code: responseCode?.toString(),
        updated_at: new Date().toISOString(),
        payment_data: sanitizedPaymentData
      })
      .eq('id', sessionId);
    
    if (updateError) {
      logStep("CARDCOM-WEBHOOK", "Error updating payment session", {
        error: updateError.message
      });
      throw new Error(`Error updating payment session: ${updateError.message}`);
    }

    logStep("CARDCOM-WEBHOOK", "Session updated", {
      sessionId,
      status
    });

    // If it was a successful payment and there's token info, save it
    if (responseCode === 0 && sanitizedPaymentData.TokenInfo) {
      const token = sanitizedPaymentData.TokenInfo.Token;
      const tokenExpDate = sanitizedPaymentData.TokenInfo.TokenExDate;
      const tokenApprovalNumber = sanitizedPaymentData.TokenInfo.TokenApprovalNumber;
      
      if (token) {
        // Get the session data to find out which user and plan this is for
        const { data: sessionData } = await supabaseAdmin
          .from('payment_sessions')
          .select('user_id, plan_id, payment_details')
          .eq('id', sessionId)
          .single();
          
        if (sessionData && (sessionData.user_id || sessionData.payment_details?.email)) {
          logStep("CARDCOM-WEBHOOK", "Saving recurring payment token", {
            userId: sessionData.user_id,
            tokenExpiry: tokenExpDate,
            planId: sessionData.plan_id,
            hasApprovalNumber: Boolean(tokenApprovalNumber)
          });
          
          // Save the token for future recurring payments
          await supabaseAdmin
            .from('recurring_payments')
            .insert({
              user_id: sessionData.user_id,
              token,
              token_expiry: tokenExpDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              plan_id: sessionData.plan_id,
              is_valid: true,
              status: 'active',
              token_approval_number: tokenApprovalNumber,
              card_details: {
                last4: sanitizedPaymentData.TranzactionInfo?.Last4CardDigits || sanitizedPaymentData.TranzactionInfo?.Last4CardDigitsString || '****',
                card_type: sanitizedPaymentData.TranzactionInfo?.CardInfo || 'Unknown',
                card_owner: sanitizedPaymentData.UIValues?.CardOwnerName || '',
                email: sanitizedPaymentData.UIValues?.CardOwnerEmail || sessionData.payment_details?.email || '',
                expiry_month: sanitizedPaymentData.TokenInfo?.CardMonth,
                expiry_year: sanitizedPaymentData.TokenInfo?.CardYear
              }
            });
            
          logStep("CARDCOM-WEBHOOK", "Saved recurring payment token", {
            userId: sessionData.user_id
          });
            
          // If a subscription doesn't exist yet, create it
          const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('user_id', sessionData.user_id)
            .eq('plan_id', sessionData.plan_id)
            .maybeSingle();
            
          if (!existingSub) {
            // Determine subscription details based on plan
            let status = 'active';
            let trialEndDate = null;
            
            if (sessionData.plan_id === 'monthly') {
              status = 'trial';
              // Set trial end date to 30 days from now
              trialEndDate = new Date();
              trialEndDate.setDate(trialEndDate.getDate() + 30);
            }
            
            logStep("CARDCOM-WEBHOOK", "Creating subscription", {
              userId: sessionData.user_id,
              planId: sessionData.plan_id,
              status,
              hasTrialEnd: Boolean(trialEndDate)
            });
            
            await supabaseAdmin
              .from('subscriptions')
              .insert({
                user_id: sessionData.user_id,
                plan_id: sessionData.plan_id,
                status,
                payment_method: 'credit_card',
                recurring_token: token,
                trial_end: trialEndDate ? trialEndDate.toISOString() : null,
                next_charge_at: trialEndDate ? trialEndDate.toISOString() : null
              });
            
            logStep("CARDCOM-WEBHOOK", "Created subscription", {
              userId: sessionData.user_id
            });
          }
        }
      }
    } else if (responseCode !== 0) {
      // Log failed transaction details
      logStep("CARDCOM-WEBHOOK", "Payment failed", {
        sessionId,
        responseCode,
        description: paymentData.Description || 'No error description provided'
      });
      
      // Record the payment error in the database
      try {
        const { data: sessionData } = await supabaseAdmin
          .from('payment_sessions')
          .select('user_id, plan_id')
          .eq('id', sessionId)
          .single();
          
        if (sessionData?.user_id) {
          await supabaseAdmin
            .from('payment_errors')
            .insert({
              user_id: sessionData.user_id,
              error_code: responseCode.toString(),
              error_message: paymentData.Description || 'Transaction failed',
              request_data: {
                planId: sessionData.plan_id,
                sessionId: sessionId
              },
              response_data: {
                responseCode: responseCode,
                description: paymentData.Description
              }
            });
            
          logStep("CARDCOM-WEBHOOK", "Recorded payment error", {
            userId: sessionData.user_id,
            errorCode: responseCode
          });
        }
      } catch (errorLogError) {
        logStep("CARDCOM-WEBHOOK", "Error recording payment error", {
          error: errorLogError instanceof Error ? errorLogError.message : String(errorLogError)
        });
      }
    }
    
    // Log the webhook event
    await supabaseAdmin
      .from('payment_logs')
      .insert({
        session_id: sessionId,
        event_type: 'webhook',
        status,
        data: sanitizedPaymentData
      });

    logStep("CARDCOM-WEBHOOK", "Webhook processing complete", {
      sessionId,
      status
    });

    // Return success to CardCom
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error processing webhook';
    logStep("CARDCOM-WEBHOOK", "Error", {
      error: errorMessage
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
