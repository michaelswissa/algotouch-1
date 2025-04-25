import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define CardCom webhook response types
interface TokenInfo {
  Token: string;
  TokenExDate: string;
  CardYear: number;
  CardMonth: number;
  TokenApprovalNumber: string;
  CardOwnerIdentityNumber?: string;
}

interface UIValues {
  CardOwnerEmail?: string;
  CardOwnerName?: string;
  CardOwnerPhone?: string;
  CardOwnerIdentityNumber?: string;
  NumOfPayments: number;
  CardYear: number;
  CardMonth: number;
  CustomFields?: Array<{ Id: number; Value: string }>;
  IsAbroadCard: boolean;
}

interface TransactionInfo {
  ResponseCode: number;
  Description?: string;
  TranzactionId: number;
  TerminalNumber: number;
  Amount: number;
  CoinId: number;
  Last4CardDigits?: number;
  Last4CardDigitsString?: string;
  CardMonth?: number;
  CardYear?: number;
  ApprovalNumber?: string;
  Token?: string;
  DocumentUrl?: string;
  IsAbroadCard?: boolean;
  [key: string]: any; // For other possible fields
}

interface DocumentInfo {
  ResponseCode: number;
  Description: string;
  DocumentType: string;
  DocumentNumber: number;
  DocumentUrl?: string;
  [key: string]: any; // For other possible fields
}

interface WebhookPayload {
  ResponseCode: number;
  Description?: string;
  TerminalNumber: number;
  LowProfileId: string;
  TranzactionId?: number;
  ReturnValue?: string;
  Operation: "ChargeOnly" | "ChargeAndCreateToken" | "CreateTokenOnly" | "SuspendedDeal" | "Do3DSAndSubmit";
  UIValues?: UIValues;
  DocumentInfo?: DocumentInfo;
  TokenInfo?: TokenInfo;
  SuspendedInfo?: { SuspendedDealId: number };
  TranzactionInfo?: TransactionInfo;
  ExternalPaymentVector?: string;
  Country?: string;
  UTM?: { Source?: string; Medium?: string; Campaign?: string; Content?: string; Term?: string };
  IssuerAuthCodeDescription?: string;
}

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-WEBHOOK] ${step}${detailsStr}`);
};

// Helper function to validate and extract token details
function extractTokenDetails(webhookData: WebhookPayload) {
  const tokenInfo = webhookData.TokenInfo;
  const transactionInfo = webhookData.TranzactionInfo;

  // Prioritize TokenInfo for token operations
  if (tokenInfo) {
    return {
      token: tokenInfo.Token,
      tokenExDate: formatTokenExpiryDate(tokenInfo.CardYear, tokenInfo.CardMonth),
      lastFourDigits: tokenInfo.Token?.slice(-4) || '',
      tokenApprovalNumber: tokenInfo.TokenApprovalNumber,
      cardOwnerIdentityNumber: tokenInfo.CardOwnerIdentityNumber,
      cardType: determineCardType(transactionInfo)
    };
  }

  // Fallback to TransactionInfo, but only for specific operations
  if (transactionInfo && 
      (webhookData.Operation === 'ChargeAndCreateToken' || 
       webhookData.Operation === 'ChargeOnly')) {
    return {
      token: transactionInfo.Token,
      tokenExDate: formatTokenExpiryDate(transactionInfo.CardYear, transactionInfo.CardMonth),
      lastFourDigits: transactionInfo.Last4CardDigitsString || '',
      cardType: determineCardType(transactionInfo)
    };
  }

  return null;
}

// Helper to format token expiry date
function formatTokenExpiryDate(year?: number, month?: number): string {
  if (!year || !month) return '';
  const fullYear = year < 100 ? 2000 + year : year;
  return `${fullYear}-${String(month).padStart(2, '0')}-01`;
}

// Helper to determine card type based on transaction info
function determineCardType(transactionInfo?: TransactionInfo): string {
  if (!transactionInfo) return 'Unknown';
  
  const cardTypeMappings = {
    'PrivateCard': 'Private',
    'MasterCard': 'MasterCard',
    'Visa': 'Visa',
    'Isracard': 'Isracard',
    // Add more mappings as needed
  };

  return cardTypeMappings[transactionInfo.Brand] || transactionInfo.Brand || 'Unknown';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method, url: req.url });

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook data - CardCom sends data in request body
    let webhookData: WebhookPayload | null = null;

    const contentType = req.headers.get('content-type') || '';
    logStep("Content-Type", { contentType });

    if (contentType.includes('application/json')) {
      webhookData = await req.json();
      logStep("Parsed JSON webhook data");
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await req.formData();
        const rawData: Record<string, any> = Object.fromEntries(formData.entries());
        
        // Process form data to convert string values to appropriate types
        webhookData = processFormData(rawData);
        logStep("Parsed form data webhook");
      } catch (formError) {
        // Handle raw form data if formData() fails
        const text = await req.text();
        logStep("FormData parsing failed, trying text parsing", { text });
        
        try {
          // Try to parse URL-encoded form data manually
          const params = new URLSearchParams(text);
          const rawData: Record<string, any> = Object.fromEntries(params.entries());
          
          // Process form data to convert string values to appropriate types
          webhookData = processFormData(rawData);
          logStep("Manually parsed form data");
        } catch (textParseError) {
          throw new Error(`Failed to parse form data: ${textParseError.message}, Raw content: ${text}`);
        }
      }
    } else {
      // Try to handle any other format as text
      const text = await req.text();
      logStep("Unexpected content type, raw content", { text });
      
      try {
        // First try to parse as JSON
        webhookData = JSON.parse(text);
        logStep("Parsed as JSON despite content type");
      } catch (e) {
        try {
          // Try to parse as URL-encoded
          const params = new URLSearchParams(text);
          const rawData: Record<string, any> = Object.fromEntries(params.entries());
          
          // Process form data to convert string values to appropriate types
          webhookData = processFormData(rawData);
          logStep("Parsed as URL-encoded despite content type");
        } catch (jsonError) {
          throw new Error(`Unsupported content type: ${contentType}, Raw content: ${text}`);
        }
      }
    }

    logStep("Received webhook data", webhookData);

    // Check if we received valid data
    if (!webhookData) {
      throw new Error("No valid data received from webhook");
    }

    // Extract required fields from webhook data
    const {
      LowProfileId: lowProfileCode,
      Operation: operation,
      ResponseCode: responseCode,
      Description: description,
      ReturnValue: returnValue,
      TranzactionId: directTransactionId,
      UIValues: uiValues,
      TokenInfo: tokenInfo,
      TranzactionInfo: transactionInfo,
      DocumentInfo: documentInfo
    } = webhookData;

    // Check all possible response code fields
    // Valid response codes are 0 (success), 700 and 701 (for validation/authorization)
    const validResponseCodes = [0, "0", 700, "700", 701, "701"];
    const hasValidResponseCode = 
      validResponseCodes.includes(responseCode) || 
      (transactionInfo && validResponseCodes.includes(transactionInfo.ResponseCode));

    logStep("Payment success check", { 
      hasValidResponseCode,
      responseCode,
      operationType: operation,
      transactionInfoResponseCode: transactionInfo?.ResponseCode
    });

    // Basic data validation
    if (!lowProfileCode) {
      logStep("Missing LowProfileId", webhookData);
      // Don't fail - return 200 so CardCom doesn't retry
      return new Response("OK - Missing LowProfileId, but accepting request", {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }

    // Find matching payment session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .maybeSingle();

    if (sessionError) {
      logStep("Payment session DB error", sessionError);
      // Don't fail - allow webhook to be idempotent and return 200
      return new Response("OK - Session not found (DB error)", {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }
    
    let session = sessionData;
    
    if (!session) {
      logStep("Payment session missing for LowProfileId", { lowProfileCode });
      
      // Try to check by ReturnValue as fallback
      if (returnValue) {
        const { data: sessionByReturnValue } = await supabaseAdmin
          .from('payment_sessions')
          .select('*')
          .eq('reference', returnValue)
          .maybeSingle();
          
        if (sessionByReturnValue) {
          logStep("Found payment session by ReturnValue", { 
            sessionId: sessionByReturnValue.id,
            reference: returnValue
          });
          
          // Continue with this session
          session = sessionByReturnValue;
        } else {
          // Don't fail
          return new Response("OK - Session not found and ReturnValue didn't match", {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/plain'
            }
          });
        }
      } else {
        // Don't fail
        return new Response("OK - Session not found and no ReturnValue", {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain'
          }
        });
      }
    }

    logStep("Found payment session", {
      sessionId: session.id,
      userId: session.user_id,
      planId: session.plan_id,
      currentStatus: session.status
    });

    // Check if this session is already processed (idempotency)
    if (session.status === 'completed' && session.transaction_id) {
      logStep("Session already completed", { 
        transactionId: session.transaction_id,
        sessionId: session.id 
      });
      return new Response("OK - Session already processed", {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }

    // Extract token information if available - based on Operation type
    let paymentMethod = null;
    
    // Handle token data extraction based on Operation type
    if (operation === "ChargeAndCreateToken" || operation === "CreateTokenOnly") {
      if (tokenInfo) {
        paymentMethod = {
          token: tokenInfo.Token,
          tokenExpiryDate: tokenInfo.TokenExDate,
          lastFourDigits: extractCardLastFourDigits(webhookData),
          expiryMonth: tokenInfo.CardMonth,
          expiryYear: tokenInfo.CardYear
        };
        logStep("Extracted token from TokenInfo", { 
          token: tokenInfo.Token, 
          expiry: tokenInfo.TokenExDate 
        });
      } else if (transactionInfo?.Token) {
        // Fallback to transaction info if token info not available
        paymentMethod = {
          token: transactionInfo.Token,
          lastFourDigits: extractCardLastFourDigits(webhookData),
          expiryMonth: transactionInfo.CardMonth,
          expiryYear: transactionInfo.CardYear
        };
        logStep("Extracted token from TransactionInfo", { token: transactionInfo.Token });
      } else {
        logStep("No token found for token operation", { operation });
      }
    } else if (operation === "ChargeOnly" && transactionInfo?.Token) {
      // Some operations might still return token data
      paymentMethod = {
        token: transactionInfo.Token,
        lastFourDigits: extractCardLastFourDigits(webhookData),
        expiryMonth: transactionInfo.CardMonth,
        expiryYear: transactionInfo.CardYear
      };
      logStep("Extracted token from ChargeOnly operation", { token: transactionInfo.Token });
    }

    // Get transaction ID from various possible fields
    const finalTransactionId = 
      directTransactionId || 
      (transactionInfo && transactionInfo.TranzactionId) || 
      null;
      
    // Determine payment status
    const status = hasValidResponseCode ? 'completed' : 'failed';
    
    logStep("Determined payment status", { 
      hasValidResponseCode, 
      status, 
      responseCode, 
      finalTransactionId,
      hasPaymentMethod: !!paymentMethod
    });

    const updateData: Record<string, any> = {
      status,
      transaction_data: webhookData,
      updated_at: new Date().toISOString()
    };

    if (finalTransactionId) {
      updateData.transaction_id = String(finalTransactionId);
    }

    if (operation === "ChargeAndCreateToken" || operation === "CreateTokenOnly") {
      const paymentMethodDetails = extractTokenDetails(webhookData);
      
      if (paymentMethodDetails) {
        updateData.payment_method = {
          ...paymentMethodDetails,
          isValid: true
        };
      }
    }

    // Always update payment session, even if called multiple times!
    const { error: updateError } = await supabaseAdmin
      .from('payment_sessions')
      .update(updateData)
      .eq('id', session.id);

    if (updateError) {
      logStep("Failed to update payment session", updateError);
      // Return OK anyway for idempotency
      return new Response("OK - Failed to update session", {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        }
      });
    }

    logStep("Updated payment session status", { status, sessionId: session.id });

    // Log transaction in either 'payment_logs' or 'payment_errors'
    const logTable = hasValidResponseCode ? 'payment_logs' : 'payment_errors';

    const logData = hasValidResponseCode
      ? {
        user_id: session.user_id,
        transaction_id: String(finalTransactionId),
        amount: session.amount,
        currency: session.currency,
        plan_id: session.plan_id,
        payment_status: 'succeeded',
        payment_data: webhookData
      }
      : {
        user_id: session.user_id,
        error_code: String(responseCode || webhookData.ResponseCode || "unknown"),
        error_message: description || webhookData.Description || 'Payment failed',
        request_data: { low_profile_code: lowProfileCode, return_value: returnValue },
        response_data: webhookData
      };

    const { error: logError } = await supabaseAdmin
      .from(logTable)
      .insert(logData);

    if (logError) {
      logStep("Error logging transaction", { error: logError.message });
      // Continue anyway
    }

    // If payment successful, update subscription record
    if (hasValidResponseCode) {
      try {
        // Calculate trial/subscription periods
        const now = new Date();
        const planId = session.plan_id;
        let trialEndsAt = null;
        let nextChargeDate = null;
        let currentPeriodEndsAt = null;
        let status = 'active';

        if (planId === 'monthly') {
          if (session.amount === 0) {
            // This is a trial
            status = 'trial';
            trialEndsAt = new Date(now);
            trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial
            nextChargeDate = new Date(trialEndsAt);
            currentPeriodEndsAt = new Date(nextChargeDate);
            currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
          } else {
            // Regular monthly payment
            currentPeriodEndsAt = new Date(now);
            currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
            nextChargeDate = new Date(currentPeriodEndsAt);
          }
        } else if (planId === 'annual') {
          if (session.amount === 0) {
            // This is a trial
            status = 'trial';
            trialEndsAt = new Date(now);
            trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
            nextChargeDate = new Date(trialEndsAt);
            currentPeriodEndsAt = new Date(nextChargeDate);
            currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
          } else {
            // Regular annual payment
            currentPeriodEndsAt = new Date(now);
            currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
            nextChargeDate = new Date(currentPeriodEndsAt);
          }
        } else if (planId === 'vip') {
          // VIP plan has no expiry
          currentPeriodEndsAt = null;
          nextChargeDate = null;
        }

        // Create or update subscription record
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('user_id', session.user_id)
          .maybeSingle();

        if (existingSubscription) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan_type: planId,
              status: planId === 'vip' ? 'active' : status,
              next_charge_date: nextChargeDate,
              trial_ends_at: trialEndsAt,
              current_period_ends_at: currentPeriodEndsAt,
              payment_method: paymentMethod,
              updated_at: now.toISOString()
            })
            .eq('id', existingSubscription.id);
        } else {
          await supabaseAdmin
            .from('subscriptions')
            .insert({
              user_id: session.user_id,
              plan_type: planId,
              status: planId === 'vip' ? 'active' : status,
              next_charge_date: nextChargeDate,
              trial_ends_at: trialEndsAt,
              current_period_ends_at: currentPeriodEndsAt,
              payment_method: paymentMethod
            });
        }
        logStep("Updated subscription record", { planId, userId: session.user_id });
        
        // Save token for recurring payments if this was a token operation
        if (operation === "ChargeAndCreateToken" || operation === "CreateTokenOnly") {
          if (paymentMethod?.token) {
            const recurringPaymentData = {
              user_id: session.user_id,
              token: paymentMethod.token,
              token_expiry: paymentMethod.tokenExpiryDate || formatExpiryDate(paymentMethod.expiryMonth, paymentMethod.expiryYear),
              last_4_digits: paymentMethod.lastFourDigits || '',
              status: 'active'
            };
            
            // Check if a recurring payment record already exists
            const { data: existingToken } = await supabaseAdmin
              .from('recurring_payments')
              .select('id')
              .eq('user_id', session.user_id)
              .maybeSingle();
              
            if (existingToken) {
              await supabaseAdmin
                .from('recurring_payments')
                .update(recurringPaymentData)
                .eq('id', existingToken.id);
              
              logStep("Updated recurring payment token", { 
                userId: session.user_id, 
                tokenId: existingToken.id 
              });
            } else {
              const { data: newToken } = await supabaseAdmin
                .from('recurring_payments')
                .insert(recurringPaymentData)
                .select('id')
                .single();
              
              logStep("Created new recurring payment token", { 
                userId: session.user_id, 
                tokenId: newToken?.id 
              });
            }
          } else {
            logStep("No token available for recurring payments", { 
              operation, 
              hasPaymentMethod: !!paymentMethod 
            });
          }
        }
      } catch (error: any) {
        logStep("Failed to update subscription", { error: error.message });
      }
    }

    // Always return OK (idempotent), to let CardCom know it received the callback!
    return new Response("OK", {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Still return OK (idempotent) to let CardCom not retry forever
    return new Response(
      errorMessage || "Webhook processing failed",
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain'
        },
      }
    );
  }
});

// Helper function to process form data or URL-encoded data to proper types
function processFormData(data: Record<string, any>): WebhookPayload {
  // Attempt to convert string fields to proper types
  const processed: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (key === 'ResponseCode' || key === 'TerminalNumber' || key === 'TranzactionId') {
      processed[key] = parseInt(value as string, 10);
    } else if (key === 'TokenInfo' || key === 'UIValues' || key === 'TranzactionInfo' || key === 'DocumentInfo' || key === 'UTM') {
      try {
        processed[key] = typeof value === 'string' ? JSON.parse(value) : value;
      } catch (e) {
        processed[key] = value;
      }
    } else {
      processed[key] = value;
    }
  }
  
  return processed as WebhookPayload;
}

// Helper to extract last 4 digits of card from various fields
function extractCardLastFourDigits(data: WebhookPayload): string {
  // Try to get it from different possible locations
  let last4 = "";
  
  if (data.TranzactionInfo?.Last4CardDigitsString) {
    last4 = data.TranzactionInfo.Last4CardDigitsString;
  } else if (data.TranzactionInfo?.Last4CardDigits) {
    last4 = String(data.TranzactionInfo.Last4CardDigits).padStart(4, '0');
  } else if (data.UIValues?.CardOwnerIdentityNumber) {
    // This is not actually the card number, but just a fallback to show something
    const idNumber = data.UIValues.CardOwnerIdentityNumber;
    last4 = idNumber.length >= 4 ? idNumber.slice(-4) : idNumber;
  }
  
  return last4;
}

// Helper to format expiry date from month and year
function formatExpiryDate(month?: number, year?: number): string {
  if (!month || !year) return '';
  
  const currentYear = new Date().getFullYear();
  const fullYear = year < 100 ? 2000 + year : year;
  
  // Format as YYYY-MM-DD
  return `${fullYear}-${String(month).padStart(2, '0')}-01`;
}
