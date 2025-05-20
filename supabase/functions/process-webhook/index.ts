
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Maximum retries for database operations
const MAX_DB_RETRIES = 3;

// Main server function
serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  const requestStartTime = Date.now();
  const requestId = `process_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
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
    const { webhookId, userId, lowProfileId, email, sessionId } = await req.json();

    if (!webhookId && !lowProfileId && !email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required parameters: either webhookId, lowProfileId, or email',
          requestId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // For debugging
    console.log(`[${requestId}] Process webhook request: webhookId=${webhookId}, userId=${userId}, lowProfileId=${lowProfileId}, email=${email}, sessionId=${sessionId}`);
    
    await logSystemEvent(
      supabaseClient,
      'info',
      'process-webhook',
      'Processing webhook',
      {
        webhookId,
        userId,
        lowProfileId,
        email,
        sessionId,
        requestId
      }
    );

    // If email is provided but no userId, try to find userId
    let effectiveUserId = userId;
    if (email && !effectiveUserId) {
      try {
        // Try with auth API first
        for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
          try {
            const { data: authUser } = await supabaseClient.auth.admin.listUsers({
              filter: { email }
            });
            
            if (authUser?.users && authUser.users.length > 0) {
              effectiveUserId = authUser.users[0].id;
              console.log(`[${requestId}] Found userId ${effectiveUserId} for email ${email}`);
              break;
            } else if (attempt < MAX_DB_RETRIES) {
              console.log(`[${requestId}] No user found for email ${email}, retry ${attempt}/${MAX_DB_RETRIES}`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          } catch (e) {
            console.error(`[${requestId}] Error finding user by email (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
      } catch (e) {
        console.error(`[${requestId}] Error finding user by email:`, e);
      }
    }

    // Scenario 1: Process a specific webhook by ID
    if (webhookId) {
      console.log(`[${requestId}] Processing webhook by ID: ${webhookId}`);
      
      // Get the webhook data with retries
      let webhookData;
      let webhookError;
      
      for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
        try {
          const result = await supabaseClient
            .from('payment_webhooks')
            .select('*')
            .eq('id', webhookId)
            .single();
            
          webhookData = result.data;
          webhookError = result.error;
          
          if (!webhookError) break; // Success, exit retry loop
          
          console.error(`[${requestId}] Error getting webhook data (attempt ${attempt}/${MAX_DB_RETRIES}):`, webhookError);
          if (attempt < MAX_DB_RETRIES) {
            // Wait with exponential backoff before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        } catch (e) {
          console.error(`[${requestId}] Exception when getting webhook data (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
          webhookError = e;
          if (attempt < MAX_DB_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (webhookError || !webhookData) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Webhook not found',
            error: webhookError?.message || 'No data found',
            requestId
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
        console.log(`[${requestId}] Updating ReturnValue to ${effectiveUserId} in webhook payload`);
        payload.ReturnValue = effectiveUserId;
      }
      
      // Simulate a webhook call by invoking the cardcom-webhook function
      let webhookResult;
      let webhookResponse;
      
      try {
        webhookResponse = await fetch(
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

        webhookResult = await webhookResponse.json();
      } catch (error) {
        console.error(`[${requestId}] Error calling cardcom-webhook:`, error);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Error processing webhook',
            error: error instanceof Error ? error.message : String(error),
            requestId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      // Mark webhook as processed if successful
      if (webhookResult.success) {
        for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
          try {
            const { error } = await supabaseClient
              .from('payment_webhooks')
              .update({
                processed: true,
                processed_at: new Date().toISOString(),
                processing_result: {
                  success: true,
                  message: 'Manually processed via API',
                  timestamp: new Date().toISOString(),
                  requestId
                }
              })
              .eq('id', webhookId);
              
            if (!error) break; // Success, exit retry loop
            
            console.error(`[${requestId}] Error updating webhook status (attempt ${attempt}/${MAX_DB_RETRIES}):`, error);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          } catch (e) {
            console.error(`[${requestId}] Exception when updating webhook status (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook processed',
          result: webhookResult,
          requestId,
          executionTime: Date.now() - requestStartTime
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Scenario 2: Process by lowProfileId
    if (lowProfileId) {
      console.log(`[${requestId}] Processing by lowProfileId: ${lowProfileId}`);
      
      // Look up the webhook by LowProfileId
      let webhookData;
      let webhookError;
      
      for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
        try {
          const result = await supabaseClient
            .from('payment_webhooks')
            .select('*')
            .filter('payload->LowProfileId', 'eq', lowProfileId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          webhookData = result.data;
          webhookError = result.error;
          
          if (!webhookError && webhookData) break; // Success, exit retry loop
          
          if (attempt < MAX_DB_RETRIES) {
            console.log(`[${requestId}] No webhook found for lowProfileId ${lowProfileId}, retry ${attempt}/${MAX_DB_RETRIES}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        } catch (e) {
          console.error(`[${requestId}] Exception when looking up webhook by LowProfileId (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
          webhookError = e;
          if (attempt < MAX_DB_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (webhookError || !webhookData) {
        // If no webhook found, try to get data directly from CardCom
        const terminalNumber = Deno.env.get('CARDCOM_TERMINAL');
        const apiName = Deno.env.get('CARDCOM_USERNAME');
        
        if (!terminalNumber || !apiName) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'CardCom credentials not found and no webhook data available',
              requestId
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }
        
        console.log(`[${requestId}] Calling CardCom API for lowProfileId ${lowProfileId}`);
        
        // Call CardCom API directly with retries
        let cardcomData;
        let cardcomError;
        
        for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
          try {
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
            
            if (cardcomResponse.ok) {
              cardcomData = await cardcomResponse.json();
              console.log(`[${requestId}] CardCom API response:`, cardcomData);
              break; // Success, exit retry loop
            } else {
              cardcomError = `${cardcomResponse.status} ${cardcomResponse.statusText}`;
              console.error(`[${requestId}] CardCom API error (attempt ${attempt}/${MAX_DB_RETRIES}): ${cardcomError}`);
              if (attempt < MAX_DB_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
              }
            }
          } catch (e) {
            console.error(`[${requestId}] Exception calling CardCom API (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
            cardcomError = e;
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
          }
        }
        
        if (!cardcomData) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Failed to get payment data from CardCom',
              error: cardcomError instanceof Error ? cardcomError.message : String(cardcomError),
              requestId
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          );
        }
        
        if (cardcomData.ResponseCode !== 0) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Payment was not successful',
              data: cardcomData,
              requestId
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
        let savedWebhook;
        
        for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
          try {
            const result = await supabaseClient
              .from('payment_webhooks')
              .insert({
                webhook_type: 'cardcom_manual_recovery',
                payload: cardcomData,
                processed: false,
                created_at: new Date().toISOString()
              })
              .select()
              .single();
              
            if (!result.error) {
              savedWebhook = result.data;
              break; // Success, exit retry loop
            }
            
            console.error(`[${requestId}] Error saving CardCom data as webhook (attempt ${attempt}/${MAX_DB_RETRIES}):`, result.error);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          } catch (e) {
            console.error(`[${requestId}] Exception saving CardCom data as webhook (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
        
        // If userId is provided, manually process the payment for this user
        if (effectiveUserId) {
          // Extract token and transaction info
          const tokenInfo = cardcomData.TokenInfo;
          const transactionInfo = cardcomData.TranzactionInfo;
          
          if (tokenInfo && tokenInfo.Token) {
            // Create/update subscription with retry logic
            let subError;
            for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
              try {
                const result = await supabaseClient
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
                  
                subError = result.error;
                
                if (!subError) break; // Success, exit retry loop
                
                console.error(`[${requestId}] Error creating subscription (attempt ${attempt}/${MAX_DB_RETRIES}):`, subError);
                if (attempt < MAX_DB_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              } catch (e) {
                console.error(`[${requestId}] Exception creating subscription (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                subError = e;
                if (attempt < MAX_DB_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              }
            }
            
            // Save token with retry logic
            let tokenError;
            for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
              try {
                const result = await supabaseClient
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
                  
                tokenError = result.error;
                
                if (!tokenError) break; // Success, exit retry loop
                
                console.error(`[${requestId}] Error saving token (attempt ${attempt}/${MAX_DB_RETRIES}):`, tokenError);
                if (attempt < MAX_DB_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              } catch (e) {
                console.error(`[${requestId}] Exception saving token (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                tokenError = e;
                if (attempt < MAX_DB_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              }
            }
            
            // Log the payment with retry logic
            let logError;
            for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
              try {
                const result = await supabaseClient
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
                  
                logError = result.error;
                
                if (!logError) break; // Success, exit retry loop
                
                console.error(`[${requestId}] Error logging payment (attempt ${attempt}/${MAX_DB_RETRIES}):`, logError);
                if (attempt < MAX_DB_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              } catch (e) {
                console.error(`[${requestId}] Exception logging payment (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                logError = e;
                if (attempt < MAX_DB_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              }
            }
            
            // Mark webhook as processed if we created one
            if (savedWebhook) {
              for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
                try {
                  const { error } = await supabaseClient
                    .from('payment_webhooks')
                    .update({
                      processed: true,
                      processed_at: new Date().toISOString(),
                      processing_result: {
                        success: true,
                        message: 'Manually processed',
                        timestamp: new Date().toISOString(),
                        requestId
                      }
                    })
                    .eq('id', savedWebhook.id);
                    
                  if (!error) break; // Success, exit retry loop
                  
                  console.error(`[${requestId}] Error marking webhook as processed (attempt ${attempt}/${MAX_DB_RETRIES}):`, error);
                  if (attempt < MAX_DB_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                  }
                } catch (e) {
                  console.error(`[${requestId}] Exception marking webhook as processed (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                  if (attempt < MAX_DB_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                  }
                }
              }
            }
            
            return new Response(
              JSON.stringify({
                success: true,
                message: 'Payment manually processed for user',
                cardcomData,
                subscriptionUpdated: !subError,
                tokenSaved: !tokenError,
                paymentLogged: !logError,
                requestId,
                executionTime: Date.now() - requestStartTime
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
            webhookId: savedWebhook?.id,
            requestId,
            executionTime: Date.now() - requestStartTime
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
        console.log(`[${requestId}] Updating ReturnValue from ${payload.ReturnValue} to ${effectiveUserId}`);
        payload.ReturnValue = effectiveUserId;
      }
      
      // Simulate a webhook call
      let webhookResult;
      try {
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

        webhookResult = await webhookResponse.json();
      } catch (error) {
        console.error(`[${requestId}] Error calling cardcom-webhook:`, error);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Error processing webhook',
            error: error instanceof Error ? error.message : String(error),
            requestId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      // Mark webhook as processed if successful
      if (webhookResult.success) {
        for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
          try {
            const { error } = await supabaseClient
              .from('payment_webhooks')
              .update({
                processed: true,
                processed_at: new Date().toISOString(),
                processing_result: {
                  success: true,
                  message: 'Manually processed via API',
                  timestamp: new Date().toISOString(),
                  requestId
                }
              })
              .eq('id', webhookData.id);
              
            if (!error) break; // Success, exit retry loop
            
            console.error(`[${requestId}] Error marking webhook as processed (attempt ${attempt}/${MAX_DB_RETRIES}):`, error);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          } catch (e) {
            console.error(`[${requestId}] Exception marking webhook as processed (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Existing webhook processed',
          result: webhookResult,
          requestId,
          executionTime: Date.now() - requestStartTime
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Scenario 3: Process by email
    if (email) {
      console.log(`[${requestId}] Processing by email: ${email}`);
      
      // First try to find a webhook with this email
      let webhooks;
      let webhookError;
      
      for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
        try {
          const result = await supabaseClient
            .from('payment_webhooks')
            .select('*')
            .or(`payload->TranzactionInfo->CardOwnerEmail.eq."${email}",payload->UIValues->CardOwnerEmail.eq."${email}"`)
            .order('created_at', { ascending: false })
            .limit(5);
            
          webhooks = result.data;
          webhookError = result.error;
          
          if (!webhookError && webhooks && webhooks.length > 0) break; // Success, exit retry loop
          
          if (attempt < MAX_DB_RETRIES) {
            console.log(`[${requestId}] No webhooks found for email ${email}, retry ${attempt}/${MAX_DB_RETRIES}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        } catch (e) {
          console.error(`[${requestId}] Exception when querying webhooks by email (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
          webhookError = e;
          if (attempt < MAX_DB_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      if (webhookError) {
        console.error(`[${requestId}] Error querying webhooks by email:`, webhookError);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Error querying webhooks by email',
            error: webhookError instanceof Error ? webhookError.message : String(webhookError),
            requestId
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
            message: `No webhooks found for email: ${email}`,
            requestId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }
      
      // Process the first webhook
      const webhook = webhooks[0];
      console.log(`[${requestId}] Processing webhook ${webhook.id} for email ${email}`);
      
      const payload = webhook.payload;
      
      // Update ReturnValue with our userId if we have one
      if (effectiveUserId && payload) {
        console.log(`[${requestId}] Setting ReturnValue to ${effectiveUserId}`);
        payload.ReturnValue = effectiveUserId;
      }
      
      // Simulate a webhook call
      let webhookResult;
      try {
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

        webhookResult = await webhookResponse.json();
      } catch (error) {
        console.error(`[${requestId}] Error calling cardcom-webhook:`, error);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Error processing webhook',
            error: error instanceof Error ? error.message : String(error),
            requestId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      // Mark webhook as processed if successful
      if (webhookResult.success) {
        for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
          try {
            const { error } = await supabaseClient
              .from('payment_webhooks')
              .update({
                processed: true,
                processed_at: new Date().toISOString(),
                processing_result: {
                  success: true,
                  message: 'Manually processed via API',
                  timestamp: new Date().toISOString(),
                  requestId
                }
              })
              .eq('id', webhook.id);
              
            if (!error) break; // Success, exit retry loop
            
            console.error(`[${requestId}] Error marking webhook as processed (attempt ${attempt}/${MAX_DB_RETRIES}):`, error);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          } catch (e) {
            console.error(`[${requestId}] Exception marking webhook as processed (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook processed by email',
          result: webhookResult,
          requestId,
          executionTime: Date.now() - requestStartTime
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
        message: 'No valid processing method found',
        requestId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Error processing webhook:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Error processing webhook',
        error: error.toString(),
        requestId,
        executionTime: Date.now() - requestStartTime
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

// Helper function to log system events
async function logSystemEvent(
  supabaseClient: any,
  level: string,
  functionName: string,
  message: string,
  details: any = {}
) {
  try {
    await supabaseClient
      .from('system_logs')
      .insert({
        level,
        function_name: functionName,
        message,
        details,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging to system_logs:', error);
  }
}
