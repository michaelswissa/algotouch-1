
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    getLpResult: "https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult"
  }
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { lowProfileCode, sessionId, operationType, planType } = await req.json();
    
    if (!lowProfileCode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "חסר מזהה ייחודי לעסקה"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    logStep("Checking payment status", { lowProfileCode, operationType, planType });
    
    // First check DB for existing completed payment
    try {
      // Check if we already have a completed payment with this low profile ID
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .select('*')
        .eq('low_profile_code', lowProfileCode)
        .eq('status', 'completed')
        .maybeSingle();
        
      if (!sessionError && sessionData) {
        logStep("Found completed payment in database", sessionData);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "תשלום הושלם בהצלחה",
            data: {
              transactionId: sessionData.transaction_id,
              token: sessionData.payment_details?.token,
              tokenExpiryDate: sessionData.payment_details?.tokenExpiryDate,
              lastFourDigits: sessionData.payment_details?.lastFourDigits
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Check payment logs
      const { data: paymentLogData, error: paymentLogError } = await supabaseAdmin
        .from('user_payment_logs')
        .select('*')
        .eq('token', lowProfileCode)
        .in('status', ['payment_success', 'token_created'])
        .maybeSingle();
        
      if (!paymentLogError && paymentLogData) {
        logStep("Found payment log entry", paymentLogData);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "תשלום הושלם בהצלחה",
            data: {
              transactionId: paymentLogData.transaction_id,
              token: paymentLogData.payment_data?.token,
              tokenExpiryDate: paymentLogData.payment_data?.tokenExpiryDate,
              lastFourDigits: paymentLogData.payment_data?.lastFourDigits
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (dbError) {
      logStep("Error checking database for payment status", { error: dbError.message });
      // Continue to check CardCom API
    }
    
    // Check CardCom API for status
    try {
      const request = {
        ApiName: CARDCOM_CONFIG.apiName,
        ApiPassword: CARDCOM_CONFIG.apiPassword,
        LowProfileId: lowProfileCode
      };
      
      logStep("Sending request to CardCom getLpResult endpoint", request);
      
      const response = await fetch(CARDCOM_CONFIG.endpoints.getLpResult, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      
      const result = await response.json();
      logStep("CardCom status check response", result);
      
      // Failed API call
      if (typeof result.ResponseCode !== 'number') {
        return new Response(
          JSON.stringify({
            processing: true,
            message: "לא ניתן לבדוק את סטטוס התשלום כרגע, אנא נסה שוב מאוחר יותר"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Success response
      if (result.ResponseCode === 0 && result.TranzactionInfo?.ResponseCode === 0) {
        // For token operations, check TokenInfo
        if ((operationType === 'token_only' || planType === 'monthly') && result.TokenInfo?.Token) {
          // Save payment details to database
          try {
            await updatePaymentSession(supabaseAdmin, lowProfileCode, {
              status: 'completed',
              transaction_id: result.TranzactionInfo.TranzactionId,
              payment_details: {
                token: result.TokenInfo.Token,
                tokenExpiryDate: result.TokenInfo.TokenExDate,
                lastFourDigits: result.TranzactionInfo.Last4CardDigits,
                responseData: result
              }
            });
            
            // Also save to payment logs
            await supabaseAdmin
              .from('user_payment_logs')
              .insert({
                token: lowProfileCode,
                transaction_id: result.TranzactionInfo.TranzactionId,
                status: 'token_created',
                payment_data: {
                  token: result.TokenInfo.Token,
                  tokenExpiryDate: result.TokenInfo.TokenExDate,
                  lastFourDigits: result.TranzactionInfo.Last4CardDigits,
                  planType: planType,
                  operationType: operationType
                }
              });
              
          } catch (dbError) {
            logStep("Error updating database with token info", { error: dbError.message });
          }
          
          return new Response(
            JSON.stringify({
              success: true,
              message: "אמצעי התשלום נשמר בהצלחה",
              data: {
                token: result.TokenInfo.Token,
                tokenExpiryDate: result.TokenInfo.TokenExDate,
                lastFourDigits: result.TranzactionInfo.Last4CardDigits,
                transactionId: result.TranzactionInfo.TranzactionId
              }
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } 
        // For payment operations, check TransactionInfo
        else if ((operationType === 'payment' || planType === 'annual' || planType === 'vip') && result.TranzactionInfo) {
          // Save payment details to database
          try {
            let paymentDetails: any = {
              transactionId: result.TranzactionInfo.TranzactionId,
              responseData: result
            };
            
            // If token was also created (for annual plan)
            if (result.TokenInfo?.Token) {
              paymentDetails.token = result.TokenInfo.Token;
              paymentDetails.tokenExpiryDate = result.TokenInfo.TokenExDate;
              paymentDetails.lastFourDigits = result.TranzactionInfo.Last4CardDigits;
            }
            
            await updatePaymentSession(supabaseAdmin, lowProfileCode, {
              status: 'completed',
              transaction_id: result.TranzactionInfo.TranzactionId,
              payment_details: paymentDetails
            });
            
            // Also save to payment logs
            await supabaseAdmin
              .from('user_payment_logs')
              .insert({
                token: lowProfileCode,
                transaction_id: result.TranzactionInfo.TranzactionId,
                status: 'payment_success',
                amount: result.TranzactionInfo.Amount,
                payment_data: {
                  ...paymentDetails,
                  planType: planType,
                  operationType: operationType
                }
              });
              
          } catch (dbError) {
            logStep("Error updating database with payment info", { error: dbError.message });
          }
          
          const responseData: any = {
            transactionId: result.TranzactionInfo.TranzactionId
          };
          
          // Include token info if available
          if (result.TokenInfo?.Token) {
            responseData.token = result.TokenInfo.Token;
            responseData.tokenExpiryDate = result.TokenInfo.TokenExDate;
            responseData.lastFourDigits = result.TranzactionInfo.Last4CardDigits;
          }
          
          return new Response(
            JSON.stringify({
              success: true,
              message: "התשלום הושלם בהצלחה",
              data: responseData
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      // Failed payment
      if (result.TranzactionInfo?.ResponseCode !== 0) {
        // Update payment session to failed
        try {
          await updatePaymentSession(supabaseAdmin, lowProfileCode, {
            status: 'failed',
            payment_details: {
              failureReason: result.TranzactionInfo.Description || 'Transaction failed',
              responseData: result
            }
          });
          
          // Also save to payment logs
          await supabaseAdmin
            .from('user_payment_logs')
            .insert({
              token: lowProfileCode,
              status: 'payment_failed',
              payment_data: {
                error: result.TranzactionInfo.Description,
                planType: planType,
                operationType: operationType,
                responseData: result
              }
            });
            
        } catch (dbError) {
          logStep("Error updating database with failure info", { error: dbError.message });
        }
        
        return new Response(
          JSON.stringify({
            failed: true,
            message: result.TranzactionInfo.Description || "התשלום נכשל",
            error: result
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Still processing or no specific status found
      return new Response(
        JSON.stringify({
          processing: true,
          message: "התשלום בתהליך עיבוד",
          details: result
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logStep("Error checking payment status via API", { error: errorMessage });
      
      return new Response(
        JSON.stringify({
          processing: true,
          message: "שגיאה בבדיקת סטטוס התשלום",
          error: errorMessage
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        processing: true,
        message: "שגיאה בבדיקת סטטוס התשלום",
        error: errorMessage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function updatePaymentSession(supabase, lowProfileCode, updateData) {
  const { error } = await supabase
    .from('payment_sessions')
    .update(updateData)
    .eq('low_profile_code', lowProfileCode);
    
  if (error) {
    logStep("Error updating payment session", { error: error.message });
    throw error;
  }
}
