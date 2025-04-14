
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

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

// Helper to sanitize and trim strings
function sanitizeString(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).trim();
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const requestBody = await req.json();
    const { lowProfileId, planId } = requestBody;
    
    if (!lowProfileId) {
      throw new Error('lowProfileId is required');
    }

    console.log('Checking payment status for', { lowProfileId, planId });
    
    // Get Cardcom credentials
    const terminalNumber = sanitizeString(Deno.env.get("CARDCOM_TERMINAL_NUMBER") || Deno.env.get("CARDCOM_TERMINAL"));
    const userName = sanitizeString(Deno.env.get("CARDCOM_API_NAME") || Deno.env.get("CARDCOM_USERNAME"));
    
    if (!terminalNumber || !userName) {
      throw new Error('Missing Cardcom API credentials in environment variables');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // First check if payment was already processed through webhook
    const { data: paymentLog, error: logError } = await supabaseClient
      .from('user_payment_logs')
      .select('*')
      .eq('token', lowProfileId)
      .maybeSingle();
    
    if (logError) {
      console.error('Error checking payment log:', logError);
    } else if (paymentLog) {
      console.log('Payment already recorded in logs:', paymentLog);
      
      return new Response(
        JSON.stringify({
          ResponseCode: 0, 
          Description: 'Payment already processed',
          paymentLog
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Make request to Cardcom API to check status - using encodeURIComponent for all parameters
    const url = `https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx`;
    const params = new URLSearchParams();
    params.append('terminalnumber', terminalNumber);
    params.append('username', userName);
    params.append('lowprofilecode', lowProfileId);
    params.append('codepage', '65001');
    
    console.log('Making request to Cardcom API:', url + '?' + params.toString());
    
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Cardcom API returned status ${response.status}`);
    }
    
    const responseData = await response.text();
    console.log('Raw cardcom response:', responseData);
    
    // Parse the response data
    const parsedResponse: any = {};
    responseData.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key && value) {
        try {
          parsedResponse[key] = decodeURIComponent(value);
        } catch (e) {
          // If decoding fails, use the raw value
          parsedResponse[key] = value;
        }
      }
    });
    
    console.log('Parsed cardcom response:', parsedResponse);
    
    // Save the payment data if transaction was successful
    if (parsedResponse.OperationResponse === '0' || parsedResponse.DealResponse === '0') {
      console.log('Payment was successful, recording in database');
      
      // Check if we have a payment session with this lowProfileId
      const { data: sessionData } = await supabaseClient
        .from('payment_sessions')
        .select('*')
        .eq('payment_details->lowProfileId', lowProfileId)
        .maybeSingle();
      
      if (sessionData) {
        console.log('Found payment session:', sessionData);
        
        // Record the payment
        const { error: paymentError } = await supabaseClient
          .from('user_payment_logs')
          .insert({
            user_id: sessionData.user_id,
            token: lowProfileId,
            status: 'completed',
            amount: sessionData.payment_details.amount || 0,
            approval_code: parsedResponse.ApprovalNumber || null,
            transaction_details: {
              paymentSession: sessionData.id,
              planId: planId || sessionData.payment_details.planId,
              cardcomResponse: parsedResponse
            }
          });
          
        if (paymentError) {
          console.error('Error recording payment:', paymentError);
        }
        
        // Process registration data if present
        if (sessionData.payment_details.isRegistrationFlow && sessionData.payment_details.registrationData) {
          console.log('Processing registration data for new user');
          // Registration data processing would happen here
        }
        
        // Update subscription status for authenticated users
        if (sessionData.user_id) {
          const { error: subscriptionError } = await supabaseClient
            .from('subscriptions')
            .upsert({
              user_id: sessionData.user_id,
              plan_type: planId || sessionData.plan_id,
              status: sessionData.payment_details.isRecurring && sessionData.payment_details.freeTrialDays > 0 
                ? 'trial' 
                : 'active',
              payment_method: {
                cardInfo: parsedResponse.CardInfo,
                lastFourDigits: parsedResponse.CardNumber5 || '****',
                expiryMonth: parsedResponse.CardValidityMonth || '**',
                expiryYear: parsedResponse.CardValidityYear || '**'
              },
              updated_at: new Date().toISOString(),
              trial_ends_at: sessionData.payment_details.freeTrialDays > 0 ? (() => {
                const date = new Date();
                date.setDate(date.getDate() + (sessionData.payment_details.freeTrialDays || 0));
                return date.toISOString();
              })() : null,
              current_period_ends_at: !sessionData.payment_details.freeTrialDays && planId !== 'vip' ? (() => {
                const date = new Date();
                if (planId === 'annual') {
                  date.setFullYear(date.getFullYear() + 1);
                } else {
                  date.setMonth(date.getMonth() + 1);
                }
                return date.toISOString();
              })() : null,
              next_charge_date: sessionData.payment_details.freeTrialDays > 0 ? (() => {
                const date = new Date();
                date.setDate(date.getDate() + (sessionData.payment_details.freeTrialDays || 0));
                return date.toISOString();
              })() : planId !== 'vip' ? (() => {
                const date = new Date();
                if (planId === 'annual') {
                  date.setFullYear(date.getFullYear() + 1);
                } else {
                  date.setMonth(date.getMonth() + 1);
                }
                return date.toISOString();
              })() : null
            });
          
          if (subscriptionError) {
            console.error('Error updating subscription:', subscriptionError);
          }
        }
      }
    }
    
    // Return the Cardcom response
    return new Response(
      JSON.stringify({
        ...parsedResponse,
        lowProfileId,
        planId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
