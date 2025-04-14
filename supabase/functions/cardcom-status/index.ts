
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
const cardcomUrl = "https://secure.cardcom.solutions";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Parse request payload
    const { lowProfileCode, sessionId } = await req.json();
    
    if (!lowProfileCode) {
      throw new Error("Missing required parameter: lowProfileCode");
    }
    
    // Validate session belongs to user
    if (sessionId) {
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('payment_sessions')
        .select('id, user_id, status')
        .eq('id', sessionId)
        .single();
        
      if (sessionError || !sessionData) {
        throw new Error("Payment session not found");
      }
      
      if (sessionData.user_id !== user.id) {
        throw new Error("Unauthorized access to payment session");
      }
      
      // If session is already completed or failed, return cached status
      if (sessionData.status === 'completed') {
        return new Response(
          JSON.stringify({
            success: true,
            status: 'completed',
            message: "Payment completed successfully"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (sessionData.status === 'failed') {
        return new Response(
          JSON.stringify({
            success: false,
            status: 'failed',
            message: "Payment failed"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Query CardCom API for transaction status
    const queryParams = new URLSearchParams({
      terminalnumber: terminalNumber,
      username: apiName,
      lowprofilecode: lowProfileCode
    });
    
    console.log("Checking payment status with CardCom API");
    const response = await fetch(
      `${cardcomUrl}/Interface/BillGoldGetLowProfileIndicator.aspx?${queryParams.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`CardCom API error: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    console.log("CardCom status response:", responseText);
    
    // Parse response parameters
    const responseParams = new URLSearchParams(responseText);
    
    const operationResponse = responseParams.get("OperationResponse") || "";
    const dealResponse = responseParams.get("DealResponse") || "";
    const isSuccessful = operationResponse === "0";
    
    // If session ID is provided, update session status
    if (sessionId) {
      const status = isSuccessful ? 'completed' : 'failed';
      const transactionId = responseParams.get("InternalDealNumber");
      
      const { error: updateError } = await supabaseClient
        .from('payment_sessions')
        .update({
          status,
          transaction_id: transactionId,
          transaction_data: Object.fromEntries(responseParams.entries())
        })
        .eq('id', sessionId);
        
      if (updateError) {
        console.error("Failed to update session status:", updateError);
      }
      
      // If payment was successful and not already processed, update subscription
      if (isSuccessful) {
        // Check if subscription already exists
        const { data: existingSubscription } = await supabaseClient
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (!existingSubscription) {
          // Get session details
          const { data: sessionData } = await supabaseClient
            .from('payment_sessions')
            .select('plan_id, amount, currency')
            .eq('id', sessionId)
            .single();
            
          if (sessionData) {
            // Create subscription
            const { error: subscriptionError } = await supabaseClient
              .from('subscriptions')
              .insert({
                user_id: user.id,
                plan_type: sessionData.plan_id,
                status: 'active',
                payment_method: {
                  type: 'credit_card',
                  last_digits: responseParams.get("CardNumber5") || '****',
                  provider: 'cardcom',
                  transaction_id: transactionId
                },
                created_at: new Date().toISOString(),
                current_period_ends_at: (() => {
                  // Calculate subscription end date based on plan
                  const date = new Date();
                  if (sessionData.plan_id === 'monthly') {
                    date.setMonth(date.getMonth() + 1);
                  } else if (sessionData.plan_id === 'annual') {
                    date.setFullYear(date.getFullYear() + 1);
                  } else if (sessionData.plan_id === 'vip') {
                    // Set far future date for lifetime plans
                    date.setFullYear(date.getFullYear() + 100);
                  }
                  return date.toISOString();
                })()
              });
              
            if (subscriptionError) {
              console.error("Failed to create subscription:", subscriptionError);
            }
          }
        }
      }
    }
    
    // Return payment status
    return new Response(
      JSON.stringify({
        success: isSuccessful,
        status: isSuccessful ? 'completed' : 'failed',
        message: isSuccessful 
          ? "Payment completed successfully" 
          : `Payment failed: ${responseParams.get("Description") || "Unknown error"}`,
        data: {
          transactionId: responseParams.get("InternalDealNumber") || null,
          responseCode: operationResponse,
          dealResponse: dealResponse
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error("Error in cardcom-status function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Payment status check failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
