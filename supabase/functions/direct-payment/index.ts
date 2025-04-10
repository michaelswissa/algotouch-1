
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Create a Supabase client
const supabaseClient = createClient(
  // Supabase API URL - env var exported by default when deployed on Supabase
  Deno.env.get('SUPABASE_URL') ?? '',
  // Supabase API SERVICE ROLE KEY - env var exported by default when deployed on Supabase
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const body = await req.json();

    // Health check for diagnostics
    if (body.action === 'health-check') {
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Direct payment Edge Function is operational' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract payment details from request
    const { token, userId, planId, operationType = 1, amount = 0 } = body;
    
    // Validate required fields
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan details if not provided
    const planDetails = { 
      monthly: { price: 9900 },
      annual: { price: 89900 },
      vip: { price: 349900 }
    };

    // For real implementation, process the payment with Cardcom API
    console.log(`Processing payment with token ${token.substring(0, 8)}... for user ${userId}`);
    
    // This would be the real API call to Cardcom
    /*
    const response = await fetch("https://secure.cardcom.solutions/api/v11/ChargeToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        TerminalNumber: Deno.env.get("CARDCOM_TERMINAL"),
        UserName: Deno.env.get("CARDCOM_USERNAME"),
        ApiPassword: Deno.env.get("CARDCOM_API_PASSWORD"),
        TokenToCharge: {
          Token: token,
          ApiLevel: 10,
          SumToBill: amount || planDetails[planId]?.price || 9900,
        },
      }),
    });
    
    const result = await response.json();
    
    if (result.ResponseCode !== 0) {
      console.error("Payment failed:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.Description || "Payment failed" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    */
    
    // For demo purposes, simulate successful payment
    const simulatedResult = {
      ResponseCode: 0,
      Description: "Approved",
      InternalDealNumber: Date.now(),
      TokenApprovalNumber: `APPROVAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    };
    
    // If user ID is provided, update subscription in database
    if (userId) {
      // Check if user already has a subscription
      const { data: existingSubscription } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (existingSubscription) {
        // Update existing subscription
        await supabaseClient
          .from('subscriptions')
          .update({
            plan_type: planId,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      } else {
        // Create new subscription
        await supabaseClient
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: planId,
            status: 'active',
          });
      }
      
      // Log payment in payment history
      await supabaseClient
        .from('payment_history')
        .insert({
          user_id: userId,
          amount: amount || planDetails[planId]?.price || 9900,
          status: 'success',
          payment_method: { 
            type: 'credit_card', 
            token: token,
            last4: '****' // For security, never store actual digits
          },
          approval_code: simulatedResult.TokenApprovalNumber
        });
    }

    // Return success response with transaction details
    return new Response(
      JSON.stringify({
        success: true,
        transactionId: simulatedResult.InternalDealNumber,
        tokenInfo: {
          tokenId: token,
          approvalCode: simulatedResult.TokenApprovalNumber
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error processing payment:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
