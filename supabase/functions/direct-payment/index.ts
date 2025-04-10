
// Direct Payment Processing Edge Function
// This function securely processes credit card payments using the Cardcom API

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
  TERMINAL: Deno.env.get('CARDCOM_TERMINAL') || "",
  USERNAME: Deno.env.get('CARDCOM_USERNAME') || "",
  PASSWORD: Deno.env.get('CARDCOM_API_PASSWORD') || "",
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
 * Check the health/status of the function and API configuration
 */
async function checkHealth() {
  try {
    // Verify the function itself is running
    const functionStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        CARDCOM_TERMINAL_CONFIGURED: !!Deno.env.get('CARDCOM_TERMINAL'),
        CARDCOM_USERNAME_CONFIGURED: !!Deno.env.get('CARDCOM_USERNAME'),
        CARDCOM_API_PASSWORD_CONFIGURED: !!Deno.env.get('CARDCOM_API_PASSWORD'),
      }
    };
    
    // Optionally check API connection (lightweight validation)
    try {
      const testUrl = `${API_CONFIG.BASE_URL}/LowProfile/GetLpResult`;
      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "TerminalNumber": parseInt(API_CONFIG.TERMINAL) || 0,
          "ApiName": API_CONFIG.USERNAME,
          "LowProfileId": "00000000-0000-0000-0000-000000000000" // Invalid ID for testing
        }),
      });
      
      // We're just checking if the API is accessible, not success of call
      functionStatus['apiAccessible'] = testResponse.status !== 0;
      functionStatus['apiResponseStatus'] = testResponse.status;
      
    } catch (apiError) {
      console.error('API connection test error:', apiError);
      functionStatus['apiAccessible'] = false;
      functionStatus['apiError'] = apiError.message;
    }
    
    return {
      success: true,
      functionStatus
    };
  } catch (error) {
    console.error('Health check error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Process direct card payment through CardCom API
 */
async function processDirectPayment(params: any) {
  const {
    planId,
    tokenData,
    customerInfo,
    registrationData
  } = params;
  
  if (!tokenData || !tokenData.token) {
    throw new Error('Missing required token information');
  }
  
  try {
    // Log request for debugging (without exposing full card details)
    console.log('Processing direct payment with params:', {
      planId,
      tokenInfo: 'present',
      customerInfo: customerInfo ? 'provided' : 'not provided',
      hasRegistrationData: !!registrationData
    });
    
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
    
    // Special case for development/test mode - return simulated response
    if (Deno.env.get('SUPABASE_ENV') === 'dev' || !API_CONFIG.TERMINAL || !API_CONFIG.USERNAME) {
      console.log('Development mode or missing credentials, returning simulated payment response');
      
      // Store the temporary registration data if provided
      const tempRegistrationId = crypto.randomUUID();
      if (registrationData) {
        try {
          const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') || '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
          );
          
          await supabaseAdmin
            .from('temp_registration_data')
            .insert({
              id: tempRegistrationId,
              registration_data: registrationData,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              used: false
            });
        } catch (error) {
          console.error('Error storing temp registration data:', error);
          // Non-fatal error, continue
        }
      }
      
      // Return simulated successful response
      return {
        success: true,
        transactionId: `sim_${Date.now()}`,
        tokenInfo: {
          token: tokenData.token,
          lastFourDigits: tokenData.lastFourDigits,
          expiryDate: `${tokenData.expiryMonth}/${tokenData.expiryYear}`
        },
        simulated: true,
        tempRegistrationId
      };
    }
    
    // Create request body for CardCom Transaction API - using token instead of direct card details
    const transactionBody: any = {
      TerminalNumber: parseInt(API_CONFIG.TERMINAL),
      ApiName: API_CONFIG.USERNAME,
      Amount: amount,
      Token: tokenData.token, // Use the token instead of card details
      ExternalUniqTranId: `dir_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      CardOwnerInformation: {
        Phone: customerInfo?.phone || '',
        FullName: tokenData.cardholderName || ''
      },
      ISOCoinId: 1 // ILS
    };
    
    // Add API password if needed for specific operations
    if (operationType === OperationType.CHARGE_ONLY || operationType === OperationType.CHARGE_AND_TOKEN) {
      transactionBody.ApiPassword = API_CONFIG.PASSWORD;
    }
    
    // Add token handling options
    if (operationType === OperationType.TOKEN_ONLY) {
      // If we already have a token, we don't need to do anything here
    } else if (operationType === OperationType.CHARGE_AND_TOKEN) {
      // If we're charging and wanting to store the token
      transactionBody.Advanced = {
        ApiPassword: API_CONFIG.PASSWORD
      };
    }
    
    console.log('CardCom API Request:', {
      url: `${API_CONFIG.BASE_URL}/Transactions/Transaction`,
      terminalNumber: transactionBody.TerminalNumber,
      amount: transactionBody.Amount,
      operationType
    });
    
    // Make request to CardCom API
    const cardcomResponse = await fetch(`${API_CONFIG.BASE_URL}/Transactions/Transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionBody)
    });
    
    if (!cardcomResponse.ok) {
      const errorDetails = await cardcomResponse.text();
      console.error('CardCom API error:', cardcomResponse.status, errorDetails);
      throw new Error(`CardCom API error: ${cardcomResponse.status} ${errorDetails}`);
    }
    
    const cardcomData = await cardcomResponse.json();
    console.log('CardCom API Response:', {
      responseCode: cardcomData.ResponseCode,
      description: cardcomData.Description,
      transactionId: cardcomData.TranzactionId
    });
    
    if (cardcomData.ResponseCode !== 0) {
      throw new Error(`CardCom API error: ${cardcomData.Description}`);
    }
    
    // Store the temporary registration data if provided
    const tempRegistrationId = crypto.randomUUID();
    if (registrationData) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') || '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        );
        
        await supabaseAdmin
          .from('temp_registration_data')
          .insert({
            id: tempRegistrationId,
            registration_data: registrationData,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            used: false
          });
      } catch (error) {
        console.error('Error storing temp registration data:', error);
        // Non-fatal error, continue
      }
    }
    
    // Return success with transaction details
    return {
      success: true,
      transactionId: cardcomData.TranzactionId,
      tokenInfo: {
        token: cardcomData.Token || tokenData.token,
        expiryDate: `${tokenData.expiryMonth}/${tokenData.expiryYear}`,
        lastFourDigits: tokenData.lastFourDigits
      },
      documentInfo: cardcomData.DocumentNumber ? {
        documentNumber: cardcomData.DocumentNumber,
        documentUrl: cardcomData.DocumentUrl
      } : null,
      tempRegistrationId,
      simulated: false
    };
    
  } catch (error) {
    console.error('Direct payment error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request body' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    console.log('Received request:', { 
      method: req.method,
      url: req.url,
      action: body.action 
    });
    
    // Handle different action types
    switch (body.action) {
      case 'health-check':
        // Health check endpoint
        const health = await checkHealth();
        return new Response(
          JSON.stringify(health),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: health.success ? 200 : 500
          }
        );
        
      case 'process':
        // Process direct card payment with token
        const processResult = await processDirectPayment(body);
        return new Response(
          JSON.stringify(processResult),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: processResult.success ? 200 : 500
          }
        );
        
      default:
        console.error('Invalid action:', body.action);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid action' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
    }
  } catch (error) {
    console.error('Global error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
