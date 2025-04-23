
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse webhook data
    const webhookData = await req.json();
    logStep("Webhook data", webhookData);
    
    if (!webhookData || !webhookData.LowProfileId) {
      return errorResponse("Invalid webhook data");
    }
    
    const lowProfileId = webhookData.LowProfileId;
    const transactionId = webhookData.TranzactionId;
    const isSuccess = webhookData.ResponseCode === 0;
    
    // Find the payment session for this transaction
    let sessionData;
    try {
      const { data, error } = await supabaseAdmin
        .from('payment_sessions')
        .select('*')
        .eq('low_profile_code', lowProfileId)
        .maybeSingle();
        
      if (error) {
        logStep("Error fetching payment session", { error: error.message });
      } else if (data) {
        sessionData = data;
        logStep("Found payment session", { sessionId: data.id });
      }
    } catch (error) {
      logStep("Exception fetching payment session", { error });
    }
    
    // Process successful transaction
    if (isSuccess) {
      logStep("Processing successful transaction", { transactionId });
      
      // Handle token creation
      if (webhookData.TokenInfo && webhookData.TokenInfo.Token) {
        logStep("Token created", { token: webhookData.TokenInfo.Token });
        
        try {
          // Update payment session with token info
          if (sessionData) {
            await supabaseAdmin
              .from('payment_sessions')
              .update({
                status: 'completed',
                transaction_id: transactionId,
                payment_details: {
                  ...sessionData.payment_details,
                  token: webhookData.TokenInfo.Token,
                  tokenExpiryDate: webhookData.TokenInfo.TokenExDate,
                  lastFourDigits: webhookData.TranzactionInfo?.Last4CardDigits,
                  webhookReceived: true,
                  webhookData: webhookData
                }
              })
              .eq('id', sessionData.id);
          }
          
          // Log the token creation
          await supabaseAdmin
            .from('user_payment_logs')
            .insert({
              user_id: sessionData?.user_id,
              token: lowProfileId,
              transaction_id: transactionId,
              status: 'token_created',
              payment_data: {
                token: webhookData.TokenInfo.Token,
                tokenExpiryDate: webhookData.TokenInfo.TokenExDate,
                lastFourDigits: webhookData.TranzactionInfo?.Last4CardDigits,
                planId: sessionData?.plan_id,
                webhookData: webhookData
              }
            });
            
          logStep("Token creation recorded");
        } catch (error) {
          logStep("Error recording token creation", { error });
        }
      }
      
      // Handle payment success
      if (webhookData.TranzactionInfo && webhookData.TranzactionInfo.ResponseCode === 0) {
        logStep("Payment succeeded", { amount: webhookData.TranzactionInfo.Amount });
        
        try {
          // Update payment session
          if (sessionData) {
            await supabaseAdmin
              .from('payment_sessions')
              .update({
                status: 'completed',
                transaction_id: transactionId,
                payment_details: {
                  ...sessionData.payment_details,
                  webhookReceived: true,
                  webhookData: webhookData,
                  amount: webhookData.TranzactionInfo.Amount
                }
              })
              .eq('id', sessionData.id);
          }
          
          // Log the payment
          await supabaseAdmin
            .from('user_payment_logs')
            .insert({
              user_id: sessionData?.user_id,
              token: lowProfileId,
              transaction_id: transactionId,
              status: 'payment_success',
              amount: webhookData.TranzactionInfo.Amount,
              payment_data: {
                planId: sessionData?.plan_id,
                webhookData: webhookData
              }
            });
            
          logStep("Payment success recorded");
        } catch (error) {
          logStep("Error recording payment success", { error });
        }
      }
      
      return successResponse("Webhook processed successfully");
    }
    // Process failed transaction
    else {
      logStep("Processing failed transaction", { responseCode: webhookData.ResponseCode });
      
      try {
        // Update payment session
        if (sessionData) {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'failed',
              payment_details: {
                ...sessionData.payment_details,
                webhookReceived: true,
                webhookData: webhookData,
                failureReason: webhookData.Description
              }
            })
            .eq('id', sessionData.id);
        }
        
        // Log the failure
        await supabaseAdmin
          .from('user_payment_logs')
          .insert({
            user_id: sessionData?.user_id,
            token: lowProfileId,
            transaction_id: transactionId,
            status: 'payment_failed',
            payment_data: {
              planId: sessionData?.plan_id,
              failureReason: webhookData.Description,
              webhookData: webhookData
            }
          });
          
        logStep("Payment failure recorded");
      } catch (error) {
        logStep("Error recording payment failure", { error });
      }
      
      return successResponse("Failed transaction recorded");
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return errorResponse(errorMessage);
  }
});

function successResponse(message: string) {
  return new Response(
    JSON.stringify({
      success: true,
      message: message
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

function errorResponse(message: string) {
  return new Response(
    JSON.stringify({
      success: false,
      message: message
    }),
    {
      status: 200, // Use 200 for webhook to acknowledge receipt
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
