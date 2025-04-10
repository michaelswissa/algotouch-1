
// Direct Payment Processing Edge Function
// This function securely processes credit card payments using the Cardcom API
// It follows PCI DSS compliance by handling card data only on the server side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

// CardCom API configuration
const API_CONFIG = {
  TERMINAL: Deno.env.get('CARDCOM_TERMINAL') || "160138", // Your terminal number
  USERNAME: Deno.env.get('CARDCOM_USERNAME') || "bLaocQRMSnwphQRUVG3b", // Your API username
  PASSWORD: Deno.env.get('CARDCOM_API_PASSWORD') || "i9nr6caGbgheTdYfQbo6", // Your API password
  BASE_URL: 'https://secure.cardcom.solutions/api/v11',
};

// Log configuration for debugging (without exposing sensitive values)
console.log('CardCom API configuration initialized with terminal:', API_CONFIG.TERMINAL);
console.log('CardCom API credentials status:', API_CONFIG.USERNAME ? '[credentials configured]' : '[credentials missing]');

// CardCom operation types
enum OperationType {
  CHARGE_ONLY = 1,        // Charge card only
  CHARGE_AND_TOKEN = 2,   // Charge and create token
  TOKEN_ONLY = 3,         // Create token only (for future charges)
}

/**
 * Initiate external payment with CardCom LowProfile
 */
async function initiateExternalPayment(params: any) {
  const {
    planId,
    userId,
    email,
    registrationData
  } = params;
  
  try {
    // Determine amount and operation type based on plan
    let amount = 0;
    let operationType = OperationType.TOKEN_ONLY;
    
    switch (planId) {
      case 'monthly':
        // For monthly plan, create token only (free trial)
        amount = 0;
        operationType = OperationType.TOKEN_ONLY;
        break;
      case 'annual':
        // For annual plan, charge and create token
        amount = 899;
        operationType = OperationType.CHARGE_AND_TOKEN;
        break;
      case 'vip':
        // For VIP plan, charge only
        amount = 3499;
        operationType = OperationType.CHARGE_ONLY;
        break;
      default:
        console.error('Invalid plan ID:', planId);
        throw new Error('Invalid plan ID');
    }
    
    // Define product name and description based on plan
    const productName = planId === 'monthly' 
      ? 'מנוי חודשי - תקופת ניסיון' 
      : planId === 'annual' 
        ? 'מנוי שנתי' 
        : 'מנוי VIP';
    
    // Generate a unique ID for this transaction
    const tempRegistrationId = crypto.randomUUID();
    const externalTransId = `dir_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Prepare request to CardCom API to create LowProfile payment page
    const payload = {
      TerminalNumber: parseInt(API_CONFIG.TERMINAL),
      ApiName: API_CONFIG.USERNAME,
      ReturnValue: tempRegistrationId || userId || 'direct-payment',
      Amount: amount,
      SuccessRedirectUrl: "https://www.placeholder.com", // Will be replaced by client
      FailedRedirectUrl: "https://www.placeholder.com", // Will be replaced by client
      WebHookUrl: "https://www.placeholder.com", // Optional for development
      ProductName: productName,
      Language: "he", // Hebrew interface
      Operation: operationType === OperationType.TOKEN_ONLY ? "CreateTokenOnly" 
               : operationType === OperationType.CHARGE_AND_TOKEN ? "ChargeAndCreateToken"
               : "ChargeOnly",
      ISOCoinId: 1, // ILS
    };
    
    console.log('CardCom LowProfile request:', {
      ...payload,
      ApiName: '****' // Hide sensitive data in logs
    });
    
    // Call CardCom API to create payment page
    const response = await fetch(`${API_CONFIG.BASE_URL}/LowProfile/Create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CardCom LowProfile API error: ${response.status}`, errorText);
      throw new Error(`CardCom API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Parse the response
    const result = await response.json();
    console.log('CardCom LowProfile API response:', result);
    
    // Check for API errors
    if (result.ResponseCode !== 0) {
      return {
        success: false,
        error: result.Description || 'Unknown error creating payment page',
        details: {
          responseCode: result.ResponseCode,
          description: result.Description
        }
      };
    }
    
    // Store registration data temporarily if provided
    if (registrationData) {
      try {
        // Create Supabase client
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );
        
        // Store in a temporary table with short expiration
        const { error: tempError } = await supabaseClient
          .from('temp_registration_data')
          .insert({
            id: tempRegistrationId,
            registration_data: registrationData,
            expires_at: new Date(Date.now() + 30 * 60000).toISOString() // 30 min expiry
          });
          
        if (tempError) {
          console.error('Error storing temp registration:', tempError);
        } else {
          console.log('Stored temp registration data with ID:', tempRegistrationId);
        }
      } catch (storageError: any) {
        console.error('Error in temp registration storage:', storageError);
      }
    }
    
    // Return successful result with payment page URL
    return {
      success: true,
      url: result.Url,
      lowProfileId: result.LowProfileId,
      tempRegistrationId
    };
  } catch (error: any) {
    console.error('Error initiating external payment:', error);
    throw error;
  }
}

/**
 * Process direct payment with credit card details
 * This function handles the sensitive card data and follows PCI DSS requirements
 */
async function processDirectPayment(params: any) {
  const {
    planId,
    cardDetails,
    userId,
    email,
    customAmount,
    registrationData,
    customerInfo
  } = params;
  
  // Validate required card details
  if (!cardDetails || !cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
    console.error('Missing required card details');
    throw new Error('Missing required card details');
  }
  
  try {
    // Determine amount and operation type based on plan
    let amount = 0;
    let operationType = OperationType.TOKEN_ONLY;
    
    if (customAmount !== undefined && customAmount > 0) {
      // If custom amount is provided, use it
      amount = customAmount;
      operationType = OperationType.CHARGE_AND_TOKEN;
    } else {
      // Otherwise determine based on plan
      switch (planId) {
        case 'monthly':
          // For monthly plan, create token only (free trial)
          amount = 0;
          operationType = OperationType.TOKEN_ONLY;
          break;
        case 'annual':
          // For annual plan, charge and create token
          amount = 899;
          operationType = OperationType.CHARGE_AND_TOKEN;
          break;
        case 'vip':
          // For VIP plan, charge only
          amount = 3499;
          operationType = OperationType.CHARGE_ONLY;
          break;
        default:
          console.error('Invalid plan ID:', planId);
          throw new Error('Invalid plan ID');
      }
    }
    
    // Define product name and description based on plan
    const productName = planId === 'monthly' 
      ? 'מנוי חודשי - תקופת ניסיון' 
      : planId === 'annual' 
        ? 'מנוי שנתי' 
        : 'מנוי VIP';
    
    // For security, log only non-sensitive data
    console.log('Processing direct payment:', {
      planId,
      amount,
      operationType,
      hasUserId: !!userId,
      hasEmail: !!email,
      hasRegistrationData: !!registrationData,
      hasCustomerInfo: !!customerInfo
    });
    
    // Prepare unique transaction ID for reference
    const externalTransId = `dir_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Extract cardholder information from registration data if available
    const cardholderName = cardDetails.cardholderName || 
                          (registrationData?.userData?.firstName 
                           ? `${registrationData.userData.firstName} ${registrationData.userData.lastName || ''}` 
                           : '');
    const cardholderEmail = email || registrationData?.email || '';
    const cardholderPhone = customerInfo?.phone || registrationData?.userData?.phone || '';
    
    // Store registration data temporarily if provided
    let tempRegistrationId = null;
    if (registrationData) {
      try {
        // Create Supabase client
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );
        
        // Generate a unique ID for this registration attempt
        tempRegistrationId = crypto.randomUUID();
        
        // Store in a temporary table with short expiration
        const { error: tempError } = await supabaseClient
          .from('temp_registration_data')
          .insert({
            id: tempRegistrationId,
            registration_data: registrationData,
            expires_at: new Date(Date.now() + 30 * 60000).toISOString() // 30 min expiry
          });
          
        if (tempError) {
          console.error('Error storing temp registration:', tempError);
        } else {
          console.log('Stored temp registration data with ID:', tempRegistrationId);
        }
      } catch (storageError: any) {
        console.error('Error in temp registration storage:', storageError);
      }
    }
    
    // Extract customer information for invoice and additional required fields
    const address = customerInfo?.address || '';
    const city = customerInfo?.city || '';
    const zipCode = customerInfo?.zipCode || '';
    const companyId = customerInfo?.companyId || '';
    const companyName = customerInfo?.companyName || '';
    
    // Enhanced document data for Cardcom according to documentation
    const documentData = {
      DocumentTypeToCreate: "Auto",
      Name: cardholderName || 'Customer',
      Email: cardholderEmail || '',
      Phone: cardholderPhone || '',
      Mobile: cardholderPhone || '',
      AddressLine1: address || '',
      City: city || '',
      TaxId: companyId || '',
      Comments: `רכישת ${productName}`,
      IsVatFree: false,
      IsSendByEmail: true,
      Products: [
        {
          Description: productName,
          UnitCost: amount,
          Quantity: 1,
          // Include total line cost to avoid rounding errors with decimals
          TotalLineCost: amount,
          // Set VAT flag if needed
          IsVatFree: false
        }
      ],
      AdvancedDefinition: {
        // Add any account management details if needed
        AccountForeignKey: userId || registrationData?.email || tempRegistrationId,
      }
    };
    
    // Call Cardcom API to process the transaction directly
    // Enhanced to include all required fields according to Cardcom documentation
    const payload = {
      // Core required fields
      TerminalNumber: parseInt(API_CONFIG.TERMINAL),
      ApiName: API_CONFIG.USERNAME,
      ApiPassword: API_CONFIG.PASSWORD, // Only included for direct API calls, not for frontend
      Amount: amount,
      CardNumber: cardDetails.cardNumber,
      CardExpirationMMYY: cardDetails.expiryDate,
      CVV2: cardDetails.cvv,
      
      // External reference IDs
      ExternalUniqTranId: externalTransId, // Unique transaction ID to prevent duplicates
      ReturnValue: tempRegistrationId || userId || 'direct-payment',
      
      // Extended card owner information
      CardOwnerInformation: {
        FullName: cardholderName,
        CardOwnerEmail: cardholderEmail,
        Phone: cardholderPhone,
        IdentityNumber: '', // Israeli ID number if available
        AvsAddress: address,
        AvsCity: city,
        AvsZip: zipCode
      },
      
      // Payment configuration
      ISOCoinId: 1, // ILS
      CoinID: 1, // Same as ISOCoinId but required separately by some Cardcom endpoints
      NumOfPayments: 1, // Default to single payment
      SumOfPayments: 1, // Required by Cardcom
      Language: "he", // Hebrew interface
      
      // Product and invoice info
      ProductName: productName, // Product description
      Description: `רכישת ${productName} באמצעות כרטיס אשראי`, // For billing records
      MoreInfo: `רכישת ${productName}`, // Additional transaction info
      ExtCompanyId: companyId || '',
      
      // Document/invoice generation
      Document: (operationType !== OperationType.TOKEN_ONLY) ? documentData : undefined,
      
      // Custom transaction fields
      CustomFields: [
        { 
          Id: 1, 
          Value: planId 
        },
        { 
          Id: 2, 
          Value: tempRegistrationId || userId || '' 
        }
      ],
      
      // Advanced transaction options
      Advanced: {
        IsCreateToken: operationType === OperationType.CHARGE_AND_TOKEN || operationType === OperationType.TOKEN_ONLY,
        SapakMutav: '', // Optional - for meaged terminals
        CreditType: 1, // Regular credit transaction
        SendNote: true, // Send email notification
        IsRefund: false // Not a refund transaction
      }
    };
    
    // For security, create a sanitized payload for logging (without card details)
    const sanitizedPayload = {
      ...payload,
      CardNumber: '************' + payload.CardNumber.slice(-4),
      CVV2: '***',
      ApiPassword: '********'
    };
    console.log('Cardcom payment request:', sanitizedPayload);
    
    // Make the direct API request to process card
    const response = await fetch(`${API_CONFIG.BASE_URL}/Transactions/Transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    // Log the request result status
    console.log('CardCom API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CardCom API error: ${response.status}`, errorText);
      throw new Error(`CardCom API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Parse the response
    const result = await response.json();
    console.log('CardCom API response data:', result);
    
    // Check for API errors
    if (result.ResponseCode !== 0) {
      return {
        success: false,
        error: result.Description || 'Unknown error processing payment',
        details: {
          responseCode: result.ResponseCode,
          description: result.Description
        }
      };
    }
    
    // Extract token information for recurring payments
    let tokenInfo = null;
    if (operationType === OperationType.CHARGE_AND_TOKEN || operationType === OperationType.TOKEN_ONLY) {
      tokenInfo = {
        token: result.Token,
        expiryDate: `${result.CardMonth}/${result.CardYear}`,
        approvalNumber: result.ApprovalNumber
      };
    }

    // Extract document information if available
    const documentInfo = result.DocumentNumber ? {
      documentNumber: result.DocumentNumber,
      documentType: result.DocumentType,
      documentUrl: result.DocumentUrl
    } : null;
    
    // Return successful result
    return {
      success: true,
      transactionId: result.TranzactionId,
      amount: result.Amount,
      cardLastDigits: result.Last4CardDigits,
      tokenInfo,
      documentInfo,
      registrationId: tempRegistrationId
    };
  } catch (error: any) {
    console.error('Error processing direct payment:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse request data
    const requestData = await req.json();
    
    // Log the request (without sensitive data)
    console.log('direct-payment function called with action:', requestData.action);
    
    // Handle different actions
    if (requestData.action === 'process') {
      // Process direct payment
      const { planId, cardDetails, registrationData, customerInfo } = requestData;
      
      if (!planId || !cardDetails) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Missing required parameters' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      try {
        // Process the payment with card details
        const paymentResult = await processDirectPayment({
          planId,
          cardDetails,
          registrationData,
          customerInfo
        });
        
        return new Response(
          JSON.stringify(paymentResult),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (cardcomError: any) {
        console.error('CardCom API error:', cardcomError);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: cardcomError.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    } else if (requestData.action === 'initiate') {
      // Create payment link/page
      const { planId, userId, email, registrationData } = requestData;
      
      if (!planId) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Missing planId parameter' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      try {
        // Generate payment page URL
        const initResult = await initiateExternalPayment({
          planId,
          userId,
          email,
          registrationData
        });
        
        return new Response(
          JSON.stringify(initResult),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (initError: any) {
        console.error('Payment initiation error:', initError);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: initError.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // If no valid action is provided
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Invalid action specified. Use "process" or "initiate".' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  } catch (error: any) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
