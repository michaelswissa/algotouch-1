
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration from environment variables
const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
const apiName = Deno.env.get("CARDCOM_API_NAME") || "bLaocQRMSnwphQRUVG3b";
const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD") || "i9nr6caGbgheTdYfQbo6";
const cardcomUrl = "https://secure.cardcom.solutions";

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-TOKEN-VALIDATE] ${step}${detailsStr}`);
};

// Validate token with CardCom GetMuhlafimTokens endpoint
async function validateTokenWithCardcom(token: string) {
  try {
    // Prepare URL-encoded form data for CardCom
    const params = new URLSearchParams({
      TerminalNumber: terminalNumber,
      UserName: apiName,
      Password: apiPassword,
      CardToken: token,
      APILevel: '10'
    });
    
    // Call CardCom API to validate the token
    const response = await fetch(`${cardcomUrl}/Interface/GetMuhlafimTokens.aspx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    // Parse response
    const responseText = await response.text();
    const responseData = new URLSearchParams(responseText);
    
    const responseCode = responseData.get('ResponseCode');
    
    logStep("CardCom token validation response", { 
      responseCode,
      token: token.substring(0, 8) + '...',
      responseText
    });
    
    return {
      isValid: responseCode === '0',
      responseCode,
      description: responseData.get('Description') || '',
      expirationDate: responseData.get('ExpirationDate') || '',
      tokenStatus: responseData.get('TokenStatus') || '',
      cardType: responseData.get('CardType') || ''
    };
  } catch (error) {
    logStep("Error validating token", { error });
    return {
      isValid: false,
      responseCode: '-1',
      description: 'Error validating token: ' + (error instanceof Error ? error.message : String(error)),
      expirationDate: '',
      tokenStatus: 'error',
      cardType: ''
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Create Supabase clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Create admin client for database operations that bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    // Parse request payload
    const { token, subscriptionId } = await req.json();
    
    // If token is provided directly, use it. Otherwise, look up from subscription
    let tokenToValidate = token;
    
    if (!tokenToValidate && subscriptionId) {
      // Get subscription data
      const { data: subscription, error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .select('payment_method')
        .eq('id', subscriptionId)
        .eq('user_id', user.id)
        .single();
      
      if (subscriptionError || !subscription) {
        throw new Error("Subscription not found");
      }
      
      const paymentMethod = subscription.payment_method as any;
      if (!paymentMethod?.token) {
        throw new Error("No payment method found for this subscription");
      }
      
      tokenToValidate = paymentMethod.token;
    }
    
    if (!tokenToValidate) {
      throw new Error("No token provided for validation");
    }
    
    // Validate the token with CardCom
    const validationResult = await validateTokenWithCardcom(tokenToValidate);
    
    // If token is invalid, update database
    if (!validationResult.isValid) {
      // Find all recurring_payments records with this token
      const { data: tokenRecords } = await supabaseAdmin
        .from('recurring_payments')
        .select('id, user_id')
        .eq('token', tokenToValidate);
      
      // If this is the current user's token, update it
      if (tokenRecords && tokenRecords.some(record => record.user_id === user.id)) {
        await supabaseAdmin
          .from('recurring_payments')
          .update({
            is_valid: false,
            payment_status: 'token_validation_failed'
          })
          .eq('token', tokenToValidate)
          .eq('user_id', user.id);
      }
    } else {
      // If token is valid, update the token status
      const { data: tokenRecords } = await supabaseAdmin
        .from('recurring_payments')
        .select('id')
        .eq('token', tokenToValidate)
        .eq('user_id', user.id);
        
      if (tokenRecords && tokenRecords.length > 0) {
        await supabaseAdmin
          .from('recurring_payments')
          .update({
            is_valid: true
          })
          .eq('token', tokenToValidate)
          .eq('user_id', user.id);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: validationResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage || "Token validation failed",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
