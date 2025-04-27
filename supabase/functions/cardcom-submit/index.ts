import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, logStep, validateLowProfileId } from "../cardcom-utils/index.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'submit';
    await logStep(functionName, "Function started");

    // Create Supabase admin client for database operations that bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      lowProfileCode,
      terminalNumber,
      operation = "ChargeOnly",
      cardOwnerDetails
    } = await req.json();
    
    if (!lowProfileCode || !validateLowProfileId(lowProfileCode)) {
      await logStep(functionName, "Invalid lowProfileId format", { lowProfileCode }, 'error', supabaseAdmin);
      throw new Error("Invalid lowProfileId format");
    }

    logStep("Received request data", {
      lowProfileCode,
      terminalNumber,
      operation,
      hasCardOwnerDetails: !!cardOwnerDetails
    });

    if (!lowProfileCode || !terminalNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate card owner details
    if (!cardOwnerDetails ||
        !cardOwnerDetails.cardOwnerName ||
        !cardOwnerDetails.cardOwnerEmail || 
        !cardOwnerDetails.cardOwnerPhone) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required card owner details",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get CardCom API configuration from environment variables
    const apiName = Deno.env.get("CARDCOM_API_NAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    
    if (!apiName) {
      throw new Error("Missing CardCom API Name in environment variables");
    }

    // Find the payment session
    const { data: paymentSession, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', lowProfileCode)
      .single();
      
    if (sessionError || !paymentSession) {
      logStep("Payment session not found", { error: sessionError?.message });
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment session not found",
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    logStep("Found payment session", { sessionId: paymentSession.id });
    
    // In a real implementation, you would make an API call to CardCom to process the payment
    // This is a placeholder for the actual API call
    
    // For this implementation, we'll just mark the payment as submitted
    await supabaseAdmin
      .from('payment_sessions')
      .update({
        status: 'submitted',
        payment_details: {
          cardOwnerName: cardOwnerDetails.cardOwnerName,
          cardOwnerEmail: cardOwnerDetails.cardOwnerEmail,
          cardOwnerPhone: cardOwnerDetails.cardOwnerPhone,
          submittedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentSession.id);
    
    logStep("Updated payment session status to submitted");
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment details submitted successfully",
        data: {
          sessionId: paymentSession.id,
          lowProfileCode
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logStep('submit', "ERROR", { message: errorMessage }, 'error', supabaseAdmin);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
