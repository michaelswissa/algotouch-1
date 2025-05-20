
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Main server function
serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
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

    // Parse the request body
    const { webhookId, userId, lowProfileId, email } = await req.json();

    if (!webhookId && !lowProfileId && !email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required parameters: either webhookId, lowProfileId, or email'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // For debugging
    console.log(`Process webhook request: webhookId=${webhookId}, userId=${userId}, lowProfileId=${lowProfileId}, email=${email}`);

    // If email is provided but no userId, try to find userId
    let effectiveUserId = userId;
    if (email && !effectiveUserId) {
      try {
        // Try with auth API first
        const { data: authUser } = await supabaseClient.auth.admin.listUsers({
          filter: { email }
        });
        
        if (authUser?.users && authUser.users.length > 0) {
          effectiveUserId = authUser.users[0].id;
          console.log(`Found userId ${effectiveUserId} for email ${email}`);
        }
      } catch (e) {
        console.error("Error finding user by email:", e);
      }
    }

    // Scenario 1: Process a specific webhook by ID
    if (webhookId) {
      console.log(`Processing webhook by ID: ${webhookId}`);
      
      // Get the webhook data
      const { data: webhookData, error: webhookError } = await supabaseClient
        .from('payment_webhooks')
        .select('*')
        .eq('id', webhookId)
        .single();

      if (webhookError || !webhookData) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Webhook not found',
            error: webhookError?.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }

      // Call the cardcom-webhook function to process the webhook
      const payload = webhookData.payload;
      
      // If userId is provided, update ReturnValue in payload
      if (effectiveUserId && payload) {
        console.log(`Updating ReturnValue to ${effectiveUserId} in webhook payload`);
        payload.ReturnValue = effectiveUserId;
      }
      
      // Simulate a webhook call by invoking the cardcom-webhook function
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

      const webhookResult = await webhookResponse.json();

      // Mark webhook as processed if successful
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
          .eq('id', webhookId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook processed',
          result: webhookResult
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Scenario 2: Process by lowProfileId
    if (lowProfileId) {
      console.log(`Processing by lowProfileId: ${lowProfileId}`);
      
      // Look up the webhook by LowProfileId
      const { data: webhookData, error: webhookError } = await supabaseClient
        .from('payment_webhooks')
        .select('*')
        .filter('payload->LowProfileId', 'eq', lowProfileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (webhookError || !webhookData) {
        // If no webhook found, try to get data directly from CardCom
        const terminalNumber = Deno.env.get('CARDCOM_TERMINAL');
        const apiName = Deno.env.get('CARDCOM_USERNAME');
        
        if (!terminalNumber || !apiName) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'CardCom credentials not found and no webhook data available'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }
        
        console.log(`Calling CardCom API for lowProfileId ${lowProfileId}`);
        
        // Call CardCom API directly
        const cardcomResponse = await fetch('https://secure.cardcom.solutions/api/v1/LowProfile/GetLpResult', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            TerminalNumber: terminalNumber,
            ApiName: apiName,
            LowProfileId: lowProfileId
          })
        });
        
        if (!cardcomResponse.ok) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Failed to get payment data from CardCom',
              error: `${cardcomResponse.status} ${cardcomResponse.statusText}`
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          );
        }
        
        const cardcomData = await cardcomResponse.json();
        console.log(`CardCom API response:`, cardcomData);
        
        if (cardcomData.ResponseCode !== 0) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Payment was not successful',
              data: cardcomData
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }
        
        // Add userId as ReturnValue if provided
        if (effectiveUserId) {
          cardcomData.ReturnValue = effectiveUserId;
        }
        
        // Save CardCom response as a webhook for future reference
        const { data: savedWebhook, error: saveError } = await supabaseClient
          .from('payment_webhooks')
          .insert({
            webhook_type: 'cardcom_manual_recovery',
            payload: cardcomData,
            processed: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (saveError) {
          console.error('Error saving CardCom data as webhook:', saveError);
        }
        
        // If userId is provided, manually process the payment for this user
        if (effectiveUserId) {
          // Extract token and transaction info
          const tokenInfo = cardcomData.TokenInfo;
          const transactionInfo = cardcomData.TranzactionInfo;
          
          if (tokenInfo && tokenInfo.Token) {
            // Create/update subscription
            const { error: subError } = await supabaseClient
              .from('subscriptions')
              .upsert({
                user_id: effectiveUserId,
                status: 'active',
                payment_method: {
                  lastFourDigits: transactionInfo?.Last4CardDigits || '****',
                  expiryMonth: transactionInfo?.CardMonth || '**',
                  expiryYear: transactionInfo?.CardYear || '****',
                  cardholderName: transactionInfo?.CardOwnerName || email || 'Card Holder'
                },
                plan_type: 'monthly', // Default to monthly plan, can be updated later
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                current_period_ends_at: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
              });
              
            if (subError) {
              console.error('Error creating subscription:', subError);
            }
            
            // Save token
            const { error: tokenError } = await supabaseClient
              .from('recurring_payments')
              .upsert({
                user_id: effectiveUserId,
                token: tokenInfo.Token,
                token_expiry: parseCardcomDateString(tokenInfo.TokenExDate),
                token_approval_number: tokenInfo.TokenApprovalNumber,
                last_4_digits: transactionInfo?.Last4CardDigits || null,
                card_type: transactionInfo?.CardInfo || null,
                status: 'active',
                is_valid: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (tokenError) {
              console.error('Error saving token:', tokenError);
            }
            
            // Log the payment
            const { error: logError } = await supabaseClient
              .from('user_payment_logs')
              .insert({
                user_id: effectiveUserId,
                subscription_id: effectiveUserId,
                token: cardcomData.LowProfileId,
                amount: transactionInfo?.Amount || cardcomData.Amount || 0,
                status: 'payment_success',
                transaction_id: cardcomData.TranzactionId?.toString() || null,
                payment_data: {
                  operation: cardcomData.Operation,
                  response_code: cardcomData.ResponseCode,
                  low_profile_id: cardcomData.LowProfileId,
                  source: 'manual_recovery',
                  card_info: transactionInfo ? {
                    last4: transactionInfo.Last4CardDigits,
                    expiry: `${transactionInfo.CardMonth}/${transactionInfo.CardYear}`
                  } : null,
                  token_info: tokenInfo ? {
                    token: tokenInfo.Token,
                    expiry: tokenInfo.TokenExDate
                  } : null
                }
              });
              
            if (logError) {
              console.error('Error logging payment:', logError);
            }
            
            // Mark webhook as processed if we created one
            if (savedWebhook) {
              await supabaseClient
                .from('payment_webhooks')
                .update({
                  processed: true,
                  processed_at: new Date().toISOString(),
                  processing_result: {
                    success: true,
                    message: 'Manually processed',
                    timestamp: new Date().toISOString()
                  }
                })
                .eq('id', savedWebhook.id);
            }
            
            return new Response(
              JSON.stringify({
                success: true,
                message: 'Payment manually processed for user',
                cardcomData,
                subscriptionUpdated: !subError,
                tokenSaved: !tokenError,
                paymentLogged: !logError
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
              }
            );
          }
        }
        
        // Just return the CardCom data if we couldn't process it
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Retrieved payment data from CardCom',
            data: cardcomData,
            webhookId: savedWebhook?.id
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      // We found an existing webhook, process it using the same code as scenario 1
      const payload = webhookData.payload;
      
      // If userId is provided and different from ReturnValue, update the payload
      if (effectiveUserId && payload && effectiveUserId !== payload.ReturnValue) {
        console.log(`Updating ReturnValue from ${payload.ReturnValue} to ${effectiveUserId}`);
        payload.ReturnValue = effectiveUserId;
      }
      
      // Simulate a webhook call
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

      const webhookResult = await webhookResponse.json();

      // Mark webhook as processed if successful
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
          .eq('id', webhookData.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Existing webhook processed',
          result: webhookResult
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Scenario 3: Process by email
    if (email) {
      console.log(`Processing by email: ${email}`);
      
      // First try to find a webhook with this email
      const { data: webhooks, error: webhookError } = await supabaseClient
        .from('payment_webhooks')
        .select('*')
        .or(`payload->TranzactionInfo->CardOwnerEmail.eq."${email}",payload->UIValues->CardOwnerEmail.eq."${email}"`)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (webhookError) {
        console.error("Error querying webhooks by email:", webhookError);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Error querying webhooks by email',
            error: webhookError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }
      
      if (!webhooks || webhooks.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `No webhooks found for email: ${email}`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }
      
      // Process the first webhook
      const webhook = webhooks[0];
      console.log(`Processing webhook ${webhook.id} for email ${email}`);
      
      const payload = webhook.payload;
      
      // Update ReturnValue with our userId if we have one
      if (effectiveUserId && payload) {
        console.log(`Setting ReturnValue to ${effectiveUserId}`);
        payload.ReturnValue = effectiveUserId;
      }
      
      // Simulate a webhook call
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

      const webhookResult = await webhookResponse.json();

      // Mark webhook as processed if successful
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
          .eq('id', webhook.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook processed by email',
          result: webhookResult
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'No valid processing method found'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
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

// Helper function to parse Cardcom date string format (YYYYMMDD) to ISO date
function parseCardcomDateString(dateStr: string): string {
  try {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    // Return in YYYY-MM-DD format
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error parsing date string:', error);
    // Return current date as fallback
    return new Date().toISOString().split('T')[0];
  }
}
