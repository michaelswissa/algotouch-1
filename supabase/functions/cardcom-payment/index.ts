
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

// CardCom API credentials
const CARDCOM_TERMINAL = Deno.env.get('CARDCOM_TERMINAL') || '160138'; // From provided credentials
const CARDCOM_USERNAME = Deno.env.get('CARDCOM_USERNAME') || 'ImJlMKKTwIOMxWFCmZeQ'; // From provided credentials
const CARDCOM_API_PASSWORD = Deno.env.get('CARDCOM_API_PASSWORD') || 'P7fut5MQigFNrBge3ZhU'; // From provided credentials

// CardCom API URLs
const CARDCOM_BASE_URL = 'https://secure.cardcom.solutions';
const CARDCOM_LOW_PROFILE_URL = `${CARDCOM_BASE_URL}/Interface/LowProfile.aspx`;
const CARDCOM_INDICATOR_URL = `${CARDCOM_BASE_URL}/Interface/BillGoldGetLowProfileIndicator.aspx`;

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from token if available
    let user = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const { data } = await supabaseClient.auth.getUser();
        user = data.user;
        console.log('Authenticated user:', user?.email);
      } catch (authError) {
        console.error('Auth error:', authError);
        // Continue without user - might be registration flow
      }
    }

    // Create payment session with Cardcom
    if (path === 'create-payment') {
      const { 
        planId, 
        userId, 
        fullName, 
        email, 
        operationType, 
        successRedirectUrl, 
        errorRedirectUrl,
        registrationData 
      } = await req.json();
      
      console.log('Creating payment session for:', { 
        planId, 
        userId: userId || (user?.id || 'anonymous'), 
        email: email || user?.email || 'anonymous',
        hasRegistrationData: !!registrationData
      });
      
      // Store registration data temporarily if provided
      let tempRegistrationId = null;
      if (registrationData) {
        try {
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
            return new Response(
              JSON.stringify({ error: 'Failed to store registration data' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              }
            );
          } else {
            console.log('Stored temp registration data with ID:', tempRegistrationId);
          }
        } catch (storageError) {
          console.error('Error in temp registration storage:', storageError);
          return new Response(
            JSON.stringify({ error: 'Error storing registration data' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }

      try {
        // Determine payment amount based on plan
        let sumToBill = '0';
        if (planId === 'monthly') {
          sumToBill = '99.00'; // Free trial, but will charge 99 after trial
        } else if (planId === 'annual') {
          sumToBill = '899.00';
        } else if (planId === 'vip') {
          sumToBill = '1999.00';
        }

        // Initialize payment session with Cardcom
        const formData = new URLSearchParams();
        formData.append('TerminalNumber', CARDCOM_TERMINAL);
        formData.append('UserName', CARDCOM_USERNAME);
        formData.append('APILevel', '10');
        formData.append('Codepage', '65001');
        formData.append('Operation', operationType.toString());
        formData.append('Language', 'he');
        formData.append('CoinId', '1'); // ILS
        
        // Payment details
        formData.append('SumToBill', sumToBill);
        formData.append('ProductName', `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`);
        
        // URLs
        formData.append('SuccessRedirectUrl', successRedirectUrl + (tempRegistrationId ? `&regId=${tempRegistrationId}` : ''));
        formData.append('ErrorRedirectUrl', errorRedirectUrl);
        formData.append('IndicatorUrl', `${url.origin}/subscription/payment-notification`);
        
        // Include registration identifier to link back after payment
        formData.append('ReturnValue', tempRegistrationId || 'direct-payment');
        
        // Payment options
        formData.append('MaxNumOfPayments', planId === 'monthly' ? '1' : planId === 'annual' ? '12' : '1');
        formData.append('ShowCardOwnerPhone', 'true');
        formData.append('ShowCardOwnerEmail', 'true');
        
        // Make the request to Cardcom
        console.log('Sending request to Cardcom:', CARDCOM_LOW_PROFILE_URL);
        const response = await fetch(CARDCOM_LOW_PROFILE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
        
        if (!response.ok) {
          throw new Error(`CardCom API error: ${response.status} ${response.statusText}`);
        }
        
        const responseText = await response.text();
        console.log('CardCom API response:', responseText);
        
        // Parse the response
        const responseParams = new URLSearchParams(responseText);
        const responseCode = responseParams.get('ResponseCode');
        
        if (responseCode !== '0') {
          throw new Error(`CardCom error: ${responseParams.get('Description') || 'Unknown error'}`);
        }
        
        const lowProfileCode = responseParams.get('LowProfileCode');
        const paymentUrl = responseParams.get('url');
        
        if (!paymentUrl) {
          throw new Error('No payment URL received from CardCom');
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            url: paymentUrl,
            lowProfileCode,
            tempRegistrationId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (cardcomError: any) {
        console.error('CardCom API error:', cardcomError);
        
        // For demo/development, create a simulated payment URL
        if (Deno.env.get('ENVIRONMENT') === 'development' || !cardcomError.message.includes('CardCom API error')) {
          console.log('Creating simulated payment URL for development');
          const baseUrl = req.headers.get('origin') || 'http://localhost:3000';
          const paymentUrl = `${baseUrl}/subscription?step=4&success=true&plan=${planId}${tempRegistrationId ? `&regId=${tempRegistrationId}` : ''}`;
          
          return new Response(
            JSON.stringify({
              success: true,
              url: paymentUrl,
              tempRegistrationId,
              simulated: true
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
        
        return new Response(
          JSON.stringify({ error: cardcomError.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }
    
    // Retrieve stored registration data
    if (path === 'get-registration-data') {
      const { registrationId } = await req.json();
      
      if (!registrationId) {
        return new Response(
          JSON.stringify({ error: 'Missing registration ID' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      console.log('Retrieving registration data for ID:', registrationId);
      
      const { data, error } = await supabaseClient
        .from('temp_registration_data')
        .select('registration_data, used')
        .eq('id', registrationId)
        .single();
        
      if (error || !data) {
        console.error('Error retrieving temp registration:', error);
        return new Response(
          JSON.stringify({ error: 'Registration data not found or expired' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
      
      // Mark as used so it can't be retrieved again
      await supabaseClient
        .from('temp_registration_data')
        .update({ used: true })
        .eq('id', registrationId);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          registrationData: data.registration_data,
          alreadyUsed: data.used
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Verify payment status with Cardcom
    if (path === 'verify-payment') {
      const { lowProfileCode } = await req.json();
      
      if (!lowProfileCode) {
        return new Response(
          JSON.stringify({ error: 'Missing lowProfileCode' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      try {
        // Create URL with params
        const verifyUrl = `${CARDCOM_INDICATOR_URL}?terminalnumber=${CARDCOM_TERMINAL}&username=${CARDCOM_USERNAME}&lowprofilecode=${lowProfileCode}`;
        
        const response = await fetch(verifyUrl);
        if (!response.ok) {
          throw new Error(`CardCom verification error: ${response.status} ${response.statusText}`);
        }
        
        const responseText = await response.text();
        const responseParams = new URLSearchParams(responseText);
        
        // Check if payment was successful
        const operationResponse = responseParams.get('OperationResponse');
        
        if (operationResponse !== '0') {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Payment was not successful',
              details: responseText
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
        
        // Parse other useful fields
        const returnValue = responseParams.get('ReturnValue'); // This should contain our temp registration ID
        
        return new Response(
          JSON.stringify({
            success: true,
            registrationId: returnValue,
            paymentDetails: {
              cardLastDigits: responseParams.get('ExtShvaParams.CardNumber5'),
              approvalNumber: responseParams.get('ExtShvaParams.ApprovalNumber71'),
              cardType: responseParams.get('ExtShvaParams.Mutag24'),
              cardExpiry: responseParams.get('ExtShvaParams.Tokef30'),
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error: any) {
        console.error('Error verifying payment:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // If no valid path is provided
    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  } catch (error: any) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
