
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Parse request body
    const { email, userId, lowProfileId } = await req.json();

    if (!email && !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required parameters: email or userId'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Log detailed information for debugging
    console.log(`Processing webhook for: email=${email}, userId=${userId}, lowProfileId=${lowProfileId}`);

    // Find the appropriate webhook to process
    let webhookToProcess = null;
    
    // First, try to find webhook by email if provided
    if (email) {
      const { data: emailWebhooks, error: emailError } = await supabaseClient
        .from('payment_webhooks')
        .select('*')
        .or(`payload->TranzactionInfo->CardOwnerEmail.eq."${email}",payload->UIValues->CardOwnerEmail.eq."${email}"`)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (emailError) {
        console.error("Error finding webhook by email:", emailError);
      } else if (emailWebhooks && emailWebhooks.length > 0) {
        console.log(`Found webhook by email: ${email}`, emailWebhooks[0].id);
        webhookToProcess = emailWebhooks[0];
      }
    }
    
    // If no webhook found by email or email not provided, try lowProfileId
    if (!webhookToProcess && lowProfileId) {
      const { data: lowProfileWebhooks, error: lowProfileError } = await supabaseClient
        .from('payment_webhooks')
        .select('*')
        .filter('payload->LowProfileId', 'eq', lowProfileId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (lowProfileError) {
        console.error("Error finding webhook by lowProfileId:", lowProfileError);
      } else if (lowProfileWebhooks && lowProfileWebhooks.length > 0) {
        console.log(`Found webhook by lowProfileId: ${lowProfileId}`, lowProfileWebhooks[0].id);
        webhookToProcess = lowProfileWebhooks[0];
      }
    }
    
    // If still no webhook found, check for user's most recent payment logs
    if (!webhookToProcess && userId) {
      const { data: paymentLogs, error: logsError } = await supabaseClient
        .from('user_payment_logs')
        .select('token')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (logsError) {
        console.error("Error finding payment logs:", logsError);
      } else if (paymentLogs && paymentLogs.length > 0) {
        // Try to find webhooks for each token
        for (const log of paymentLogs) {
          if (!log.token) continue;
          
          const { data: tokenWebhooks } = await supabaseClient
            .from('payment_webhooks')
            .select('*')
            .filter('payload->LowProfileId', 'eq', log.token)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (tokenWebhooks && tokenWebhooks.length > 0) {
            console.log(`Found webhook by payment log token: ${log.token}`, tokenWebhooks[0].id);
            webhookToProcess = tokenWebhooks[0];
            break;
          }
        }
      }
    }
    
    // If no webhook found at all, try to manually create subscription
    if (!webhookToProcess) {
      if (userId) {
        console.log("No webhook found, attempting to create subscription manually");
        
        // Look for payment data in user_payment_logs
        const { data: paymentData } = await supabaseClient
          .from('user_payment_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (paymentData && paymentData.length > 0) {
          const payment = paymentData[0];
          
          // Check for token/recurring payment info
          const { data: tokenData } = await supabaseClient
            .from('recurring_payments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);
          
          // Create or update subscription manually
          if (tokenData && tokenData.length > 0) {
            const token = tokenData[0];
            const paymentMethod = {
              lastFourDigits: token.last_4_digits || '****',
              expiryMonth: token.token_expiry ? token.token_expiry.substring(5, 7) : '**',
              expiryYear: token.token_expiry ? token.token_expiry.substring(0, 4) : '****',
              cardholderName: email || 'Card Holder'
            };
            
            // Calculate current_period_ends_at (1 month from now)
            const currentDate = new Date();
            const nextMonth = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
            
            // Try to create or update subscription
            const { data: subData, error: subError } = await supabaseClient
              .from('subscriptions')
              .upsert({
                user_id: userId,
                plan_type: payment.payment_data?.plan_type || 'monthly',
                status: 'active',
                payment_method: paymentMethod,
                created_at: new Date().toISOString(),
                current_period_ends_at: nextMonth.toISOString(),
              })
              .select()
              .single();
              
            if (subError) {
              console.error("Error creating subscription manually:", subError);
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  message: 'שגיאה ביצירת מנוי',
                  error: subError.message
                }),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 500
                }
              );
            }
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'מנוי נוצר ידנית',
                subscription: subData
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'לא נמצאו נתונים מספיקים ליצירת מנוי ידנית'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'לא נמצא webhook לעיבוד'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }
    
    // Now we have a webhook to process
    console.log("Processing webhook:", webhookToProcess.id);
    
    // Prepare the payload - set ReturnValue to userId if provided
    const payload = { ...webhookToProcess.payload };
    if (userId) {
      payload.ReturnValue = userId;
    }
    
    // Call the cardcom-webhook function to process
    const webhookResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify(payload)
      }
    );
    
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      throw new Error(`Error processing webhook: ${errorText}`);
    }

    const webhookResult = await webhookResponse.json();

    // Mark webhook as processed
    if (webhookResult.success) {
      await supabaseClient
        .from('payment_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_result: {
            success: true,
            message: 'Manually processed via API',
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', webhookToProcess.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'העיבוד הושלם בהצלחה',
        result: webhookResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Error processing webhook',
        error: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
