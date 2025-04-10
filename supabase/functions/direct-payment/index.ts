
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
    
    // Extract customer information for invoice
    const address = customerInfo?.address || '';
    const city = customerInfo?.city || '';
    const zipCode = customerInfo?.zipCode || '';
    const companyId = customerInfo?.companyId || '';
    
    // Prepare document data if needed
    const documentData = {
      Name: cardholderName || 'Customer',
      Email: cardholderEmail || '',
      Phone: cardholderPhone || '',
      AddressLine1: address || '',
      City: city || '',
      Mobile: cardholderPhone || '',
      TaxId: companyId || '',
      Products: [
        {
          Description: productName,
          UnitCost: amount,
          Quantity: 1
        }
      ]
    };
    
    // Call Cardcom API to process the transaction directly
    const payload = {
      TerminalNumber: parseInt(API_CONFIG.TERMINAL),
      ApiName: API_CONFIG.USERNAME,
      ApiPassword: API_CONFIG.PASSWORD, // Only included for direct API calls, not for frontend
      Amount: amount,
      CardNumber: cardDetails.cardNumber,
      CardExpirationMMYY: cardDetails.expiryDate,
      CVV2: cardDetails.cvv,
      ExternalUniqTranId: externalTransId,
      ReturnValue: tempRegistrationId || userId || 'direct-payment',
      CardOwnerInformation: {
        FullName: cardholderName,
        CardOwnerEmail: cardholderEmail,
        Phone: cardholderPhone,
        Address: address,
        City: city,
        ZipCode: zipCode
      },
      ISOCoinId: 1, // ILS
      SumOfPayments: 1, // Default to single payment
      Language: "he", // Hebrew interface
      ProductName: productName, // Product description
      MoreInfo: `רכישת ${productName} באמצעות כרטיס אשראי`,
      ExtCompanyId: companyId || '',
      // Include document info if we're charging (not just token creation)
      Document: (operationType !== OperationType.TOKEN_ONLY) ? documentData : undefined,
      CustomFields: [
        { 
          Id: 1, 
          Value: planId 
        },
        { 
          Id: 2, 
          Value: tempRegistrationId || userId || '' 
        }
      ]
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
    // Parse request path and data
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';
    
    // Create a Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user information if available
    let user = null;
    try {
      const { data } = await supabaseClient.auth.getUser();
      user = data.user;
      console.log('Authenticated user:', user?.email);
    } catch (authError) {
      console.error('Auth error:', authError);
      // Continue without user - might be registration flow
    }
    
    // Process direct payment
    if (path === 'process') {
      const requestData = await req.json();
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
          userId: user?.id,
          email: user?.email,
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
    }

    // If no valid path is provided
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Invalid endpoint' 
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
