
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define types
interface StatusRequest {
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  timestamp?: string;
  attempt?: number;
  operationType?: 'payment' | 'token_only';
}

interface StatusResponse {
  success: boolean;
  processing?: boolean;
  failed?: boolean;
  message?: string;
  data?: any;
}

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
    // Parse request
    const requestBody: StatusRequest = await req.json();
    const { lowProfileCode, sessionId, attempt, operationType } = requestBody;
    
    logStep("Request received", {
      lowProfileCode, 
      sessionId,
      attempt, 
      operationType
    });

    // Validate input
    if (!lowProfileCode || !sessionId) {
      return new Response(
        JSON.stringify({
          success: false, 
          failed: true,
          message: 'Missing required parameters: lowProfileCode or sessionId'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, fetch the payment session
    const { data: paymentSession, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .maybeSingle();

    if (sessionError) {
      logStep("Failed to fetch session data", sessionError);
      
      return new Response(
        JSON.stringify({
          success: false,
          failed: true,
          message: 'Error checking payment status'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!paymentSession) {
      logStep("Payment session not found", { lowProfileCode, sessionId });
      
      return new Response(
        JSON.stringify({
          success: false,
          failed: true,
          message: 'Payment session not found'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    logStep("Retrieved payment session", {
      id: paymentSession.id,
      status: paymentSession.status,
      transaction_id: paymentSession.transaction_id,
    });

    // Check if the session has completed transaction
    if (paymentSession.status === 'completed' && paymentSession.transaction_id) {
      logStep("Payment session already completed", {
        id: paymentSession.id,
        transaction_id: paymentSession.transaction_id,
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: paymentSession.id,
            status: 'completed',
            transactionId: paymentSession.transaction_id
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if the session has failed explicitly
    if (paymentSession.status === 'failed') {
      logStep("Payment session marked as failed", { id: paymentSession.id });
      
      const errorMessage = paymentSession.transaction_data?.Description || 
                          paymentSession.transaction_data?.description || 
                          'The payment could not be processed';
      
      return new Response(
        JSON.stringify({
          success: false,
          failed: true,
          message: errorMessage
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Now check for token creation if that was the operation
    if (operationType === 'token_only' && paymentSession.payment_method?.token) {
      logStep("Token created successfully", { 
        token: paymentSession.payment_method.token 
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: paymentSession.id,
            status: 'token_created',
            token: paymentSession.payment_method.token
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // At this point, we're still processing
    logStep("Payment still processing", { 
      id: paymentSession.id, 
      status: paymentSession.status,
      attempt 
    });
    
    // Provide a response indicating processing
    const response: StatusResponse = {
      success: false,
      processing: true,
      message: 'Payment still processing'
    };

    // For early checks, we don't want to show failure yet
    if (Number(attempt) <= 3) {
      response.failed = false;
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    logStep("Error processing request", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        failed: true,
        message: 'Error checking payment status',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
