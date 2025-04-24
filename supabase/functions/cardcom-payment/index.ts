
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARDCOM_CONFIG = {
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    createLowProfile: "https://secure.cardcom.solutions/api/v11/LowProfile/Create",
    getLowProfile: "https://secure.cardcom.solutions/api/v11/LowProfile/GetById"
  }
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-PAYMENT] ${step}${detailsStr}`);
};

const isSuccessCode = (code: any): boolean => {
  const numCode = typeof code === 'string' ? parseInt(code) : code;
  return numCode === 0 || numCode === 700 || numCode === 701;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestData;
  try {
    requestData = await req.json();
    logStep("Request received", { action: requestData.action });
  } catch (error) {
    logStep("Error parsing request body", { error: error.message });
    return new Response(
      JSON.stringify({
        success: false,
        message: "Invalid request body",
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { action } = requestData;
    
    if (action === 'doTransaction') {
      const { 
        terminalNumber, 
        cardNumber,
        token,
        amount,
        cardOwnerInformation,
        externalUniqTranId,
        numOfPayments,
        document
      } = requestData;
      
      logStep("Processing transaction", { 
        hasToken: !!token, 
        hasCardNumber: !!cardNumber,
        amount
      });

      const transactionPayload = {
        TerminalNumber: terminalNumber || parseInt(CARDCOM_CONFIG.terminalNumber),
        ApiName: CARDCOM_CONFIG.apiName,
        Amount: amount,
        Token: token,
        CardNumber: cardNumber,
        ExternalUniqTranId: externalUniqTranId || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        NumOfPayments: numOfPayments || 1,
        CardOwnerInformation: cardOwnerInformation,
        Document: document
      };

      const response = await fetch('https://secure.cardcom.solutions/api/v11/Transaction/DoTransaction', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionPayload),
      });
      
      const responseData = await response.json();
      logStep("Transaction response", responseData);
      
      if (responseData.ResponseCode === 0 || responseData.ResponseCode === 700 || responseData.ResponseCode === 701) {
        return new Response(
          JSON.stringify({
            success: true,
            data: responseData,
            message: "Transaction completed successfully"
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          data: responseData,
          message: responseData.Description || "Transaction failed"
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'check-status') {
      const { lowProfileCode, sessionId, attempt } = requestData;
      logStep("Checking transaction status", { lowProfileCode, sessionId, attempt });
      
      if (!lowProfileCode || !sessionId) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Missing required parameters",
            processing: false,
            failed: true
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase configuration");
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .select('*')
        .eq('low_profile_code', lowProfileCode)
        .single();

      if (sessionError) {
        logStep("Error fetching payment session", sessionError);
        return new Response(
          JSON.stringify({
            success: false,
            message: "Payment session not found",
            processing: true,
            error: sessionError.message
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      logStep("Session data from database", {
        status: sessionData.status,
        hasTransactionId: !!sessionData.transaction_id,
        transactionId: sessionData.transaction_id,
        paymentMethod: sessionData.payment_method,
      });

      if (sessionData.status === 'completed' && sessionData.transaction_id) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment completed successfully",
            processing: false,
            data: {
              transactionId: sessionData.transaction_id,
            }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (sessionData.status === 'failed') {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Payment failed",
            processing: false,
            failed: true,
            data: {
              error: sessionData.transaction_data?.Description || "Payment was declined"
            }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      try {
        const getLowProfileRequest = {
          TerminalNumber: parseInt(CARDCOM_CONFIG.terminalNumber),
          ApiName: CARDCOM_CONFIG.apiName,
          LowProfileId: lowProfileCode
        };

        logStep("Querying CardCom API directly");
        
        const response = await fetch(CARDCOM_CONFIG.endpoints.getLowProfile, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(getLowProfileRequest),
        });
        
        const responseData = await response.json();
        logStep("CardCom API response", responseData);
        
        const transactionInfo = responseData.TranzactionInfo;
        
        if (responseData.ResponseCode === 0 && transactionInfo) {
          const transactionResponseCode = transactionInfo.ResponseCode;
          
          if (isSuccessCode(transactionResponseCode)) {
            await supabaseAdmin
              .from('payment_sessions')
              .update({
                status: 'completed',
                transaction_id: transactionInfo.TranzactionId,
                transaction_data: responseData,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId);
              
            await supabaseAdmin
              .from('payment_logs')
              .insert({
                user_id: sessionData.user_id,
                transaction_id: transactionInfo.TranzactionId,
                amount: sessionData.amount,
                currency: sessionData.currency,
                plan_id: sessionData.plan_id,
                payment_status: 'succeeded',
                payment_data: responseData
              });
              
            return new Response(
              JSON.stringify({
                success: true,
                message: "Payment completed successfully (confirmed with CardCom API)",
                processing: false,
                data: {
                  transactionId: transactionInfo.TranzactionId
                }
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          
          if (transactionResponseCode > 0 && transactionResponseCode !== 700 && transactionResponseCode !== 701) {
            await supabaseAdmin
              .from('payment_sessions')
              .update({
                status: 'failed',
                transaction_data: responseData,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId);
              
            await supabaseAdmin
              .from('payment_errors')
              .insert({
                user_id: sessionData.user_id,
                error_code: transactionResponseCode.toString(),
                error_message: transactionInfo.Description || 'Payment failed',
                request_data: getLowProfileRequest,
                response_data: responseData
              });
              
            return new Response(
              JSON.stringify({
                success: false,
                message: transactionInfo.Description || "Payment failed",
                processing: false,
                failed: true
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }
        
        const tokenInfo = responseData.TokenInfo;
        const operationType = requestData.operationType;
        
        if (responseData.ResponseCode === 0 && tokenInfo && operationType === 'token_only') {
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: tokenInfo.Token,
              payment_method: {
                token: tokenInfo.Token,
                tokenExpiryDate: tokenInfo.TokenExDate,
                expiryMonth: tokenInfo.CardMonth,
                expiryYear: tokenInfo.CardYear
              },
              transaction_data: responseData,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
            
          return new Response(
            JSON.stringify({
              success: true,
              message: "Token created successfully",
              processing: false,
              data: {
                token: tokenInfo.Token
              }
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } catch (apiError) {
        logStep("Error querying CardCom API", { error: apiError.message });
      }
      
      const { data: paymentLog } = await supabaseAdmin
        .from('payment_logs')
        .select('*')
        .eq('transaction_id', lowProfileCode)
        .maybeSingle();
        
      if (paymentLog) {
        logStep("Found payment in logs", paymentLog);
        
        await supabaseAdmin
          .from('payment_sessions')
          .update({
            status: 'completed',
            transaction_id: paymentLog.transaction_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
          
        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment completed successfully (found in logs)",
            processing: false,
            data: {
              transactionId: paymentLog.transaction_id
            }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment is still processing",
          processing: true,
          attempt: attempt || 1
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      planId, 
      amount, 
      currency = "ILS", 
      invoiceInfo, 
      userId,
      registrationData,
      redirectUrls,
      operationType = 'payment'
    } = requestData;
    
    logStep("Processing payment session request", { planId, amount, currency, operationType });

    if (!planId || !amount || !redirectUrls) {
      throw new Error("Missing required parameters");
    }

    const userEmail = invoiceInfo?.email || registrationData?.email;
    const fullName = invoiceInfo?.fullName || 
                    (registrationData?.userData ? 
                      `${registrationData.userData.firstName || ''} ${registrationData.userData.lastName || ''}`.trim() : 
                      undefined);
    
    if (!userEmail) {
      throw new Error("Missing email address");
    }
    
    const transactionRef = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Fix webhook URL to use proper domain with project ID
    const projectId = "ndhakvhrrkczgylcmyoc";
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/cardcom-webhook`;
    
    logStep("Creating Cardcom request", { webhookUrl, transactionRef });

    // Prepare the CardCom payload according to API documentation
    const cardcomPayload = {
      TerminalNumber: parseInt(CARDCOM_CONFIG.terminalNumber),
      ApiName: CARDCOM_CONFIG.apiName,
      Operation: operationType === 'token_only' || planId === 'monthly' ? "ChargeAndCreateToken" : "ChargeOnly",
      ReturnValue: transactionRef,
      Amount: amount,
      WebHookUrl: webhookUrl,
      SuccessRedirectUrl: redirectUrls.success,
      FailedRedirectUrl: redirectUrls.failed,
      ProductName: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      Language: "he",
      ISOCoinId: currency === "ILS" ? 1 : 2,
      UIDefinition: {
        IsHideCardOwnerName: false,
        IsHideCardOwnerEmail: false,
        IsHideCardOwnerPhone: false,
        CardOwnerEmailValue: userEmail,
        CardOwnerNameValue: fullName || '',
        CardOwnerIdValue: registrationData?.userData?.idNumber || '',
        CardOwnerPhoneValue: registrationData?.userData?.phone || '',
        IsCardOwnerEmailRequired: true,
        IsCardOwnerPhoneRequired: true,
        IsHideCardOwnerIdentityNumber: false
      }
    };
    
    logStep("Sending request to Cardcom", cardcomPayload);
    
    const response = await fetch(CARDCOM_CONFIG.endpoints.createLowProfile, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cardcomPayload),
    });
    
    const responseData = await response.json();
    
    logStep("Cardcom response", responseData);
    
    if (responseData.ResponseCode !== 0) {
      logStep("Error response from Cardcom", responseData);
      return new Response(
        JSON.stringify({
          success: false,
          message: responseData.Description || "Cardcom initialization failed",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!responseData.LowProfileId) {
      logStep("Missing LowProfileId in response", responseData);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing LowProfileId in Cardcom response",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Store the payment session in the database
    const sessionData = {
      user_id: userId,
      low_profile_code: responseData.LowProfileId,
      reference: transactionRef,
      plan_id: planId,
      amount: amount,
      currency: currency,
      status: 'initiated',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      anonymous_data: !userId ? { email: userEmail, fullName } : null,
      cardcom_terminal_number: CARDCOM_CONFIG.terminalNumber
    };

    let dbSessionId;
    
    try {
      const { data: dbSession, error: sessionError } = await supabaseAdmin
        .from('payment_sessions')
        .insert(sessionData)
        .select('id')
        .single();
            
      if (sessionError) {
        logStep("Error creating payment session", sessionError);
        throw new Error("Failed to create payment session");
      }

      if (!dbSession?.id) {
        logStep("No session ID returned", dbSession);
        throw new Error("No session ID returned from database");
      }

      dbSessionId = dbSession.id;
      logStep("Payment session stored", { sessionId: dbSessionId });

    } catch (dbError) {
      logStep("Database error", dbError);
      throw new Error("Failed to store payment session");
    }
    
    // Return all required data for frontend
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment session created",
        data: {
          sessionId: dbSessionId,
          lowProfileCode: responseData.LowProfileId,
          terminalNumber: CARDCOM_CONFIG.terminalNumber,
          cardcomUrl: "https://secure.cardcom.solutions",
          url: responseData.Url // Include original redirect URL from CardCom
        }
      }), {
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
        message: errorMessage || "Payment initialization failed",
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
