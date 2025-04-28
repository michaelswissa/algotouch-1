import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Log a step in the function execution with optional details
 */
async function logStep(
  functionName: string,
  step: string, 
  details?: any, 
  level: 'info' | 'warn' | 'error' = 'info',
  supabaseAdmin?: any
) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  const prefix = `[CARDCOM-${functionName.toUpperCase()}][${level.toUpperCase()}][${timestamp}]`;
  
  console.log(`${prefix} ${step}${detailsStr}`);
  
  // Store critical logs in database
  if (level === 'error' && supabaseAdmin) {
    try {
      await supabaseAdmin.from('system_logs').insert({
        function_name: `cardcom-${functionName}`,
        level,
        message: step,
        details: details || {},
        created_at: timestamp
      });
    } catch (e) {
      // Don't let logging errors affect main flow
      console.error('Failed to log to database:', e);
    }
  }
}

/**
 * Validate if a string is a valid UUID for LowProfileId
 */
function validateLowProfileId(lowProfileId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lowProfileId);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const functionName = 'status';
    await logStep(functionName, "Function started");

    // Create Supabase admin client for database operations that bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Extract request parameters
    const { lowProfileCode } = await req.json();
    
    if (!lowProfileCode || !validateLowProfileId(lowProfileCode)) {
      await logStep(functionName, "Invalid lowProfileCode format", { lowProfileCode }, 'error', supabaseAdmin);
      throw new Error("Invalid lowProfileCode format");
    }

    await logStep(functionName, "Checking payment status", { lowProfileCode });

    // Check for transaction record in our database
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_id', lowProfileCode)
      .maybeSingle();

    if (sessionError) {
      await logStep(functionName, "Error fetching payment session", { error: sessionError.message }, 'error', supabaseAdmin);
      throw new Error("Error fetching payment status");
    }

    if (!sessionData) {
      await logStep(functionName, "Payment session not found", { lowProfileCode }, 'warn');
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment session not found",
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check the status of the session
    const isCompleted = sessionData.status === 'completed';
    const isProcessing = sessionData.status === 'processing';
    const isFailed = sessionData.status === 'failed';
    const isExpired = sessionData.status === 'expired';

    await logStep(functionName, `Found payment session with status: ${sessionData.status}`, {
      sessionId: sessionData.id,
      status: sessionData.status,
      transactionId: sessionData.transaction_id
    });

    // For sessions that are not in a final state, fetch from CardCom if needed
    if (!isCompleted && !isFailed && !isExpired && sessionData.transaction_id === null) {
      try {
        // Get CardCom API configuration
        const cardcomTerminal = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
        const cardcomApiName = Deno.env.get("CARDCOM_API_NAME");

        if (!cardcomTerminal || !cardcomApiName) {
          await logStep(functionName, "Missing CardCom API configuration", {}, 'error', supabaseAdmin);
          throw new Error("Missing CardCom API configuration");
        }

        // Call CardCom API to check transaction status
        const response = await fetch('https://secure.cardcom.solutions/api/v11/LowProfile/GetLowProfileResult', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            TerminalNumber: cardcomTerminal,
            ApiName: cardcomApiName,
            LowProfileId: lowProfileCode
          })
        });

        if (!response.ok) {
          throw new Error(`CardCom API returned ${response.status}: ${await response.text()}`);
        }

        const cardcomResult = await response.json();
        await logStep(functionName, "CardCom API response", cardcomResult);

        // Process the result from CardCom
        if (cardcomResult.ResponseCode === 0 && cardcomResult.TranzactionInfo) {
          // Success - update our session
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: cardcomResult.TranzactionInfo.TranzactionId || cardcomResult.TranzactionId,
              transaction_data: cardcomResult,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionData.id);

          // Create log entry
          await supabaseAdmin.from('user_payment_logs').insert({
            user_id: sessionData.user_id || null,
            token: lowProfileCode,
            transaction_id: cardcomResult.TranzactionInfo.TranzactionId || cardcomResult.TranzactionId,
            amount: sessionData.amount,
            status: 'payment_success',
            payment_data: cardcomResult,
            currency: sessionData.currency || 'ILS'
          });

          await logStep(functionName, "Updated payment status to completed", {
            sessionId: sessionData.id,
            transactionId: cardcomResult.TranzactionInfo.TranzactionId
          });

          // Success response
          return new Response(
            JSON.stringify({
              success: true,
              message: "Payment completed successfully",
              data: {
                sessionId: sessionData.id,
                status: 'completed',
                cardcomResponse: cardcomResult
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (cardcomResult.ResponseCode !== 0) {
          // Payment failed in CardCom
          await supabaseAdmin
            .from('payment_sessions')
            .update({
              status: 'failed',
              transaction_data: cardcomResult,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionData.id);

          // Create log entry
          await supabaseAdmin.from('user_payment_logs').insert({
            user_id: sessionData.user_id || null,
            token: lowProfileCode,
            amount: sessionData.amount,
            status: 'payment_failed',
            payment_data: cardcomResult,
            currency: sessionData.currency || 'ILS'
          });

          await logStep(functionName, "Updated payment status to failed", {
            sessionId: sessionData.id,
            responseCode: cardcomResult.ResponseCode,
            description: cardcomResult.Description
          }, 'warn');

          // Failure response
          return new Response(
            JSON.stringify({
              success: false,
              message: cardcomResult.Description || "Payment failed",
              data: {
                sessionId: sessionData.id,
                status: 'failed',
                cardcomResponse: cardcomResult
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Still processing
          await logStep(functionName, "Payment still processing", { sessionId: sessionData.id });
          
          return new Response(
            JSON.stringify({
              success: false,
              message: "Payment is still processing",
              data: {
                sessionId: sessionData.id,
                status: 'processing'
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (cardcomError) {
        await logStep(functionName, "Error checking with CardCom API", cardcomError, 'error', supabaseAdmin);
        
        // Don't change session status on API errors
        return new Response(
          JSON.stringify({
            success: false,
            message: "Error checking payment status with CardCom",
            error: cardcomError instanceof Error ? cardcomError.message : String(cardcomError)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return the status based on our database state
    if (isCompleted) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment completed successfully",
          data: {
            sessionId: sessionData.id,
            status: sessionData.status,
            transactionId: sessionData.transaction_id
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (isFailed) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment failed",
          data: {
            sessionId: sessionData.id,
            status: sessionData.status
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (isExpired) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment session expired",
          data: {
            sessionId: sessionData.id,
            status: sessionData.status
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Still processing or in another state
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payment is still processing",
          data: {
            sessionId: sessionData.id,
            status: sessionData.status
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CARDCOM-STATUS][ERROR] ${errorMessage}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
