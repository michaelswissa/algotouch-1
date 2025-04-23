
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration
const CARDCOM_CONFIG = {
  terminalNumber: 160138,
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
    
    // Parse request data
    const requestData = await req.json();
    const { lowProfileCode, sessionId, operationType, planType } = requestData;
    
    logStep("Checking payment status for", { lowProfileCode, sessionId, operationType, planType });
    
    if (!lowProfileCode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "חסר מזהה עסקה (LowProfileCode)"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // First check if we already have a completed payment session
    try {
      const { data: existingSession, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .select('*')
        .eq('low_profile_code', lowProfileCode)
        .eq('status', 'completed')
        .maybeSingle();
        
      if (!sessionError && existingSession) {
        logStep("Found completed session in database", { id: existingSession.id });
        
        // Session already complete, return success
        return new Response(
          JSON.stringify({
            success: true,
            message: "תשלום הושלם בהצלחה",
            data: {
              transactionId: existingSession.transaction_id,
              token: existingSession.payment_details?.token || null,
              tokenExpiryDate: existingSession.payment_details?.tokenExpiryDate || null,
              lastFourDigits: existingSession.payment_details?.lastFourDigits || null
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Also check payment logs
      const { data: paymentLog, error: paymentLogError } = await supabaseAdmin
        .from('user_payment_logs')
        .select('*')
        .eq('token', lowProfileCode)
        .order('created_at', { ascending: false })
        .maybeSingle();
        
      if (!paymentLogError && paymentLog && 
          (paymentLog.status === 'payment_success' || paymentLog.status === 'token_created')) {
        logStep("Found successful payment log", { id: paymentLog.id });
        
        // Payment logged as successful
        return new Response(
          JSON.stringify({
            success: true,
            message: "תשלום הושלם בהצלחה",
            data: {
              transactionId: paymentLog.transaction_id,
              token: paymentLog.payment_data?.token || null,
              tokenExpiryDate: paymentLog.payment_data?.tokenExpiryDate || null,
              lastFourDigits: paymentLog.payment_data?.lastFourDigits || null
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (dbError) {
      logStep("Error checking database", { error: dbError.message });
      // Continue to API check if DB check fails
    }
    
    // Call CardCom API to get current status
    const payload = {
      ApiName: CARDCOM_CONFIG.apiName,
      ApiPassword: CARDCOM_CONFIG.apiPassword,
      LowProfileId: lowProfileCode
    };
    
    logStep("Calling CardCom API to check status");
    
    const response = await fetch(CARDCOM_CONFIG.endpoints.getLpResult, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    logStep("CardCom API response", { responseCode: result.ResponseCode });
    
    // Process the result
    if (result.ResponseCode === 0) {
      // Transaction succeeded
      if (result.TranzactionInfo?.ResponseCode === 0) {
        const transactionId = result.TranzactionInfo.TranzactionId;
        let tokenData = null;
        
        // Check for token creation
        if (result.TokenInfo?.Token) {
          tokenData = {
            token: result.TokenInfo.Token,
            tokenExpiryDate: result.TokenInfo.TokenExDate,
            lastFourDigits: result.TranzactionInfo?.Last4CardDigits,
            cardMonth: result.TranzactionInfo?.CardMonth,
            cardYear: result.TranzactionInfo?.CardYear
          };
          
          logStep("Token created", { token: tokenData.token });
          
          // Save token data to database
          try {
            // First update the payment session
            const { error: sessionUpdateError } = await supabaseAdmin
              .from('payment_sessions')
              .update({
                status: 'completed',
                transaction_id: transactionId,
                payment_details: {
                  ...tokenData,
                  webhookData: result
                }
              })
              .eq('low_profile_code', lowProfileCode);
              
            if (sessionUpdateError) {
              logStep("Error updating session with token", { error: sessionUpdateError.message });
            }
            
            // Then log the token creation
            const { error: logError } = await supabaseAdmin
              .from('user_payment_logs')
              .insert({
                user_id: null, // Will be linked by webhook
                token: lowProfileCode,
                transaction_id: transactionId,
                status: 'token_created',
                amount: result.TranzactionInfo.Amount || 0,
                payment_data: {
                  ...tokenData,
                  planId: planType,
                  webhookData: result
                }
              });
              
            if (logError) {
              logStep("Error logging token creation", { error: logError.message });
            }
          } catch (dbError) {
            logStep("Database error saving token", { error: dbError.message });
          }
        }
        
        // Save transaction data
        try {
          // Update payment session with transaction info
          const sessionUpdateData: any = {
            status: 'completed',
            transaction_id: transactionId,
            payment_details: {
              amount: result.TranzactionInfo.Amount,
              webhookData: result
            }
          };
          
          if (tokenData) {
            sessionUpdateData.payment_details = {
              ...sessionUpdateData.payment_details,
              ...tokenData
            };
          }
          
          const { error: sessionUpdateError } = await supabaseAdmin
            .from('payment_sessions')
            .update(sessionUpdateData)
            .eq('low_profile_code', lowProfileCode);
            
          if (sessionUpdateError) {
            logStep("Error updating session with transaction", { error: sessionUpdateError.message });
          }
          
          // Log the payment
          if (result.TranzactionInfo.Amount > 0) {
            const { error: logError } = await supabaseAdmin
              .from('user_payment_logs')
              .insert({
                user_id: null, // Will be linked by webhook
                token: lowProfileCode,
                transaction_id: transactionId,
                status: 'payment_success',
                amount: result.TranzactionInfo.Amount,
                payment_data: {
                  planId: planType,
                  webhookData: result,
                  ...(tokenData || {})
                }
              });
              
            if (logError) {
              logStep("Error logging payment", { error: logError.message });
            }
          }
        } catch (dbError) {
          logStep("Database error saving transaction", { error: dbError.message });
        }
        
        // Return success with transaction and optional token data
        return new Response(
          JSON.stringify({
            success: true,
            message: (result.TranzactionInfo.Amount > 0) 
              ? "התשלום הושלם בהצלחה" 
              : "פעולת התשלום הושלמה בהצלחה",
            data: {
              transactionId,
              amount: result.TranzactionInfo.Amount,
              ...(tokenData || {})
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } 
      // Transaction failed or still processing
      else if (result.TranzactionInfo?.ResponseCode !== 0) {
        logStep("Transaction failed", { 
          code: result.TranzactionInfo.ResponseCode, 
          description: result.TranzactionInfo.Description 
        });
        
        // Update session with failure
        try {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'failed',
              payment_details: {
                errorCode: result.TranzactionInfo.ResponseCode,
                errorMessage: result.TranzactionInfo.Description,
                webhookData: result
              }
            })
            .eq('low_profile_code', lowProfileCode);
            
          // Log the failure
          await supabaseAdmin
            .from('user_payment_logs')
            .insert({
              user_id: null,
              token: lowProfileCode,
              status: 'payment_failed',
              payment_data: {
                planId: planType,
                errorCode: result.TranzactionInfo.ResponseCode,
                errorMessage: result.TranzactionInfo.Description,
                webhookData: result
              }
            });
        } catch (dbError) {
          logStep("Error logging transaction failure", { error: dbError.message });
        }
        
        return new Response(
          JSON.stringify({
            failed: true,
            message: result.TranzactionInfo.Description || "התשלום נכשל",
            error: {
              code: result.TranzactionInfo.ResponseCode,
              message: result.TranzactionInfo.Description
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    // Transaction is still processing or not started
    return new Response(
      JSON.stringify({
        processing: true,
        message: "התשלום בתהליך עיבוד"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
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
