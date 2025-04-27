
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
    doTransaction: "https://secure.cardcom.solutions/api/v11/Transaction/DoTransaction"
  }
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-TRANSACTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Create Supabase admin client for database operations that bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const {
      userId,
      amount,
      cardToken,
      cardNumber,
      cardExpirationMMYY,
      cvv,
      cardOwnerInformation,
      numOfPayments = 1,
      externalUniqTranId,
      isRefund = false,
      operation = "ChargeOnly", // Default operation
      customFields,
      currencyCode = "ILS",
      document,
      advanced = {}
    } = await req.json();
    
    logStep("Received request data", { 
      userId, 
      amount, 
      hasToken: !!cardToken,
      hasCardNumber: !!cardNumber,
      operation,
      isRefund
    });

    if (!amount) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required amount parameter",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate unique transaction reference if not provided
    const transactionRef = externalUniqTranId || `txn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Create the payload for CardCom transaction API
    const transactionPayload = {
      // Required fields
      TerminalNumber: CARDCOM_CONFIG.terminalNumber,
      ApiName: CARDCOM_CONFIG.apiName,
      Amount: amount,
      
      // Card identification (either token or card details)
      Token: cardToken || undefined,
      CardNumber: cardNumber || undefined,
      CardExpirationMMYY: cardExpirationMMYY || undefined,
      CVV2: cvv || undefined,
      
      // Transaction control
      ExternalUniqTranId: transactionRef,
      ExternalUniqUniqTranIdResponse: true, // Return original response if duplicate
      NumOfPayments: numOfPayments,
      
      // Card owner details
      CardOwnerInformation: cardOwnerInformation ? {
        Phone: cardOwnerInformation.phone,
        FullName: cardOwnerInformation.fullName,
        IdentityNumber: cardOwnerInformation.identityNumber,
        CardOwnerEmail: cardOwnerInformation.email,
        AvsZip: cardOwnerInformation.avsZip,
        AvsAddress: cardOwnerInformation.avsAddress,
        AvsCity: cardOwnerInformation.avsCity
      } : undefined,
      
      // Currency information
      ISOCoinId: currencyCode === "ILS" ? 1 : (currencyCode === "USD" ? 2 : undefined),
      ISOCoinName: currencyCode,
      
      // Custom fields
      CustomFields: customFields,
      
      // Advanced settings
      Advanced: {
        // Apply advanced parameters passed in the request
        ...advanced,
        
        // If this is a refund, we need the API password
        IsRefund: isRefund,
        ApiPassword: isRefund ? CARDCOM_CONFIG.apiPassword : undefined,
        
        // Default to J5 (full authorization) if not specified
        JValidateType: advanced.JValidateType || 5,
      },
      
      // Document information (for receipt/invoice)
      Document: document ? {
        DocumentTypeToCreate: document.documentType || "Receipt",
        Name: document.name,
        TaxId: document.taxId,
        Email: document.email,
        IsSendByEmail: document.isSendByEmail ?? true,
        AddressLine1: document.addressLine1,
        AddressLine2: document.addressLine2,
        City: document.city,
        Mobile: document.mobile,
        Phone: document.phone,
        Comments: document.comments,
        IsVatFree: document.isVatFree,
        DepartmentId: document.departmentId,
        
        // Advanced document settings
        AdvancedDefinition: document.advancedDefinition,
        
        // Products for the document
        Products: document.products?.map(product => ({
          ProductID: product.productId,
          Description: product.description,
          Quantity: product.quantity,
          UnitCost: product.unitCost,
          TotalLineCost: product.totalLineCost,
          IsVatFree: product.isVatFree,
          ExternalId: product.externalId
        })) || [{
          Description: operation === "ChargeOnly" ? 
            `תשלום חד פעמי` : 
            (isRefund ? `זיכוי` : `תשלום`),
          UnitCost: amount,
          Quantity: 1
        }]
      } : undefined
    };
    
    logStep("Sending request to CardCom");
    
    // Process transaction with CardCom
    const response = await fetch(CARDCOM_CONFIG.endpoints.doTransaction, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionPayload),
    });
    
    const responseData = await response.json();
    
    logStep("CardCom response", responseData);
    
    const isSuccess = responseData.ResponseCode === 0 || 
                      responseData.ResponseCode === 700 || 
                      responseData.ResponseCode === 701;
    
    // Store transaction data in database
    try {
      const transactionLogData = {
        user_id: userId,
        transaction_id: responseData.TranzactionId?.toString() || null,
        reference: transactionRef,
        amount: amount,
        currency: currencyCode,
        payment_status: isSuccess ? 'completed' : 'failed',
        payment_data: {
          request: {
            ...transactionPayload,
            // Remove sensitive data before storing
            CardNumber: cardNumber ? "****" : undefined,
            CVV2: cvv ? "***" : undefined,
            ApiPassword: undefined
          },
          response: responseData
        }
      };
      
      const { error: logError } = await supabaseAdmin
        .from('payment_logs')
        .insert(transactionLogData);
      
      if (logError) {
        logStep("Error logging transaction", { error: logError });
        // Don't fail the request if logging fails
      } else {
        logStep("Transaction logged successfully");
      }
    } catch (dbError) {
      logStep("Exception logging transaction", { error: dbError });
      // Continue despite DB error
    }
    
    // Map response fields to a cleaner structure
    const formattedResponse = {
      success: isSuccess,
      responseCode: responseData.ResponseCode,
      description: responseData.Description || null,
      transactionId: responseData.TranzactionId?.toString() || null,
      amount: responseData.Amount,
      currency: responseData.CoinId === 1 ? "ILS" : (responseData.CoinId === 2 ? "USD" : null),
      cardDetails: {
        last4Digits: responseData.Last4CardDigits?.toString() || null,
        cardType: responseData.CardInfo || null,
        cardBrand: responseData.Brand || null,
        cardMonth: responseData.CardMonth,
        cardYear: responseData.CardYear,
        ownerName: responseData.CardOwnerName || null,
        ownerEmail: responseData.CardOwnerEmail || null,
        ownerPhone: responseData.CardOwnerPhone || null
      },
      paymentInfo: {
        approvalNumber: responseData.ApprovalNumber || null,
        token: responseData.Token || null,
        numberOfPayments: responseData.NumberOfPayments || 1,
        firstPaymentAmount: responseData.FirstPaymentAmount || null,
        constPaymentAmount: responseData.ConstPaymentAmount || null
      },
      documentInfo: responseData.DocumentNumber ? {
        documentNumber: responseData.DocumentNumber,
        documentType: responseData.DocumentType,
        documentUrl: responseData.DocumentUrl
      } : null,
      isRefund: responseData.IsRefund || false
    };
    
    return new Response(
      JSON.stringify({
        success: isSuccess,
        message: responseData.Description || (isSuccess ? "Transaction processed successfully" : "Transaction failed"),
        data: formattedResponse,
        rawResponse: responseData // Include full response for debugging
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
        message: errorMessage || "Transaction processing failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
