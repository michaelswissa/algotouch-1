
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const requestData = await req.json();

    // Validate required fields
    if (!requestData.lowProfileCode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: lowProfileCode' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // In a real implementation, you would:
    // 1. Call the CardCom API to check the payment status
    // 2. Update the transaction status in the database
    // 3. Return the appropriate response

    // Let's simulate checking the transaction status
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    let transactionStatus = 'success'; // Default to success for demo
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Check if the transaction exists
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('low_profile_code', requestData.lowProfileCode)
          .single();
        
        if (transaction) {
          // For demo purposes, let's simulate a transaction that completes after a short time
          const createdAt = new Date(transaction.created_at);
          const now = new Date();
          const secondsElapsed = (now.getTime() - createdAt.getTime()) / 1000;
          
          // Simulate success after 5 seconds
          if (secondsElapsed > 5) {
            transactionStatus = 'success';
            
            // Update the transaction status
            await supabase
              .from('payment_transactions')
              .update({ status: 'success', updated_at: new Date().toISOString() })
              .eq('low_profile_code', requestData.lowProfileCode);
          } else {
            transactionStatus = 'pending';
          }
        } else {
          transactionStatus = 'not_found';
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Continue even if database query fails
      }
    }

    // Prepare the response
    const simulatedResponse = {
      success: true,
      data: {
        lowProfileCode: requestData.lowProfileCode,
        status: transactionStatus,
        timestamp: new Date().toISOString(),
        isComplete: transactionStatus === 'success' || transactionStatus === 'failed',
        details: transactionStatus === 'success' ? 
          { message: 'Transaction completed successfully' } : 
          { message: 'Transaction is still being processed' }
      }
    };

    return new Response(
      JSON.stringify(simulatedResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error("Error checking payment status:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error checking payment status: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
