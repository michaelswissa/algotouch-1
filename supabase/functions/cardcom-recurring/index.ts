
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration
const CARDCOM_CONFIG = {
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    transaction: "https://secure.cardcom.solutions/api/v11/Transactions/Transaction",
    tokenInfo: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult"
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get request data
    const { 
      action, 
      userId,
      subscriptionId,
      amount,
      tokenData,
      description 
    } = await req.json();

    console.log(`Processing ${action} request for user ${userId}`);

    // Handle different actions
    switch (action) {
      case 'charge_monthly':
        return await processRecurringCharge(supabaseAdmin, userId, subscriptionId, amount, tokenData, description);
      case 'get_token_info':
        return await getTokenInfo(tokenData.lowProfileCode);
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Invalid action specified" 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error("Error in cardcom-recurring function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Process a recurring charge using a saved token
async function processRecurringCharge(
  supabase: any,
  userId: string,
  subscriptionId: string,
  amount: number,
  tokenData: any,
  description: string = "Monthly subscription charge"
) {
  // Validate required data
  if (!tokenData?.token) {
    throw new Error("Missing token information");
  }

  // Create unique reference for this transaction
  const transactionRef = `monthly-${userId}-${Date.now()}`;
  
  console.log(`Processing ${amount} ILS charge for subscription ${subscriptionId}`);
  
  // Prepare CardCom transaction payload
  const payload = {
    TerminalNumber: CARDCOM_CONFIG.terminalNumber,
    ApiName: CARDCOM_CONFIG.apiName,
    ApiPassword: CARDCOM_CONFIG.apiPassword,
    Token: tokenData.token,
    Amount: amount,
    ExternalMerchantId: transactionRef,
    CardOwnerInformation: {
      Phone: "nnn",
      FullName: "nnn",
      CardOwnerEmail: "nnn"
    },
    ISOCoinId: 1, // ILS
    Document: {
      Name: tokenData.cardOwnerName || "Subscriber",
      Email: tokenData.cardOwnerEmail,
      DocumentTypeToCreate: "Receipt", // Receipt or TaxInvoiceAndReceipt
      Products: [
        {
          Description: description || "Monthly subscription",
          UnitCost: amount,
          Quantity: 1
        }
      ]
    }
  };
  
  // Call CardCom API to process the charge
  const response = await fetch(CARDCOM_CONFIG.endpoints.transaction, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  
  const responseData = await response.json();
  console.log("CardCom transaction response:", responseData);
  
  // Process the response
  const isSuccess = responseData.ResponseCode === 0;
  
  // Record transaction in database
  try {
    const { error } = await supabase
      .from('payment_logs')
      .insert({
        user_id: userId,
        transaction_id: responseData.TranzactionId,
        amount: amount,
        currency: "ILS",
        plan_id: "monthly",
        payment_status: isSuccess ? 'succeeded' : 'failed',
        payment_data: responseData
      });
      
    if (error) {
      console.error("Error recording payment:", error);
    }
    
    // If successful, update subscription record
    if (isSuccess) {
      const now = new Date();
      const nextPeriodEnd = new Date();
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
      
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          current_period_ends_at: nextPeriodEnd.toISOString(),
          next_charge_date: nextPeriodEnd.toISOString(),
          status: 'active',
          updated_at: now.toISOString()
        })
        .eq('id', subscriptionId);
        
      if (subError) {
        console.error("Error updating subscription:", subError);
      }
    }
  } catch (dbError) {
    console.error("Database error:", dbError);
    // Continue with the response even if DB operations fail
  }
  
  return new Response(
    JSON.stringify({ 
      success: isSuccess, 
      transaction: {
        id: responseData.TranzactionId,
        amount: amount,
        reference: transactionRef,
        status: isSuccess ? 'succeeded' : 'failed'
      },
      message: responseData.Description || (isSuccess ? "Transaction successful" : "Transaction failed") 
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

// Get token information from a lowProfileCode
async function getTokenInfo(lowProfileCode: string) {
  if (!lowProfileCode) {
    throw new Error("Missing lowProfileCode");
  }
  
  const payload = {
    ApiName: CARDCOM_CONFIG.apiName,
    ApiPassword: CARDCOM_CONFIG.apiPassword,
    LowProfileId: lowProfileCode
  };
  
  const response = await fetch(CARDCOM_CONFIG.endpoints.tokenInfo, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  
  const responseData = await response.json();
  
  if (responseData.ResponseCode !== 0) {
    throw new Error(`Error getting token info: ${responseData.Description || "Unknown error"}`);
  }
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      tokenInfo: responseData.TokenInfo 
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
