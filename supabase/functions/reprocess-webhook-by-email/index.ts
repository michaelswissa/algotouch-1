
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Create Supabase client with service role key
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
    const { email, lowProfileId, userId: providedUserId } = await req.json();

    if (!email && !lowProfileId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Either email or lowProfileId must be provided',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Processing webhook recovery request: email=${email}, lowProfileId=${lowProfileId}, providedUserId=${providedUserId}`);

    // Find user either by email or directly from provided userId
    let userId = providedUserId;
    
    if (!userId && email) {
      // First try with auth API for more reliable user lookup
      try {
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.listUsers({
          filter: {
            email: email
          },
        });
        
        if (!authError && authUser?.users && authUser.users.length > 0) {
          userId = authUser.users[0].id;
          console.log(`Found user with email ${email}: ${userId}`);
        } else {
          // Fallback to direct DB query
          const { data: userData, error: userError } = await supabaseClient
            .from('auth.users')
            .select('id')
            .eq('email', email)
            .single();

          if (!userError && userData) {
            userId = userData.id;
            console.log(`Found user with email ${email} (backup method): ${userId}`);
          } else {
            console.error(`User not found with email ${email}: `, authError || userError);
          }
        }
      } catch (e) {
        console.error("Error finding user by email:", e);
      }
      
      if (!userId) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `User not found with email: ${email}`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
    }

    // Find payment webhooks
    let webhookQuery = supabaseClient.from('payment_webhooks').select('*');
    
    if (lowProfileId) {
      webhookQuery = webhookQuery.filter('payload->LowProfileId', 'eq', lowProfileId);
    } else if (email) {
      // Try different paths where email might be stored in the webhook payload
      console.log(`Looking for webhooks with email ${email}`);
      webhookQuery = webhookQuery.or(
        `payload->TranzactionInfo->CardOwnerEmail.eq."${email}",payload->UIValues->CardOwnerEmail.eq."${email}"`
      );
    }
    
    const { data: webhooks, error: webhookError } = await webhookQuery.order('created_at', { ascending: false });

    if (webhookError) {
      console.error("Error fetching webhooks:", webhookError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Error fetching webhooks',
          error: webhookError.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      console.log(`No webhooks found for email=${email}, lowProfileId=${lowProfileId}`);
      
      // If lowProfileId is provided, try direct call to CardCom API
      if (lowProfileId) {
        console.log(`Attempting direct CardCom API call with lowProfileId ${lowProfileId}`);
        const terminalNumber = Deno.env.get('CARDCOM_TERMINAL');
        const apiName = Deno.env.get('CARDCOM_USERNAME');
        
        if (terminalNumber && apiName) {
          try {
            const cardcomResponse = await fetch(
              'https://secure.cardcom.solutions/api/v1/LowProfile/GetLpResult',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  TerminalNumber: terminalNumber,
                  ApiName: apiName,
                  LowProfileId: lowProfileId
                })
              }
            );
            
            if (cardcomResponse.ok) {
              const cardcomData = await cardcomResponse.json();
              console.log(`CardCom API response for ${lowProfileId}:`, cardcomData);
              
              // Create a webhook entry for this data
              const { data: savedWebhook, error: saveError } = await supabaseClient
                .from('payment_webhooks')
                .insert({
                  webhook_type: 'cardcom_manual_recovery',
                  payload: { 
                    ...cardcomData,
                    ReturnValue: userId 
                  },
                  processed: false,
                  created_at: new Date().toISOString(),
                  processing_attempts: 0
                })
                .select()
                .single();
                
              if (saveError) {
                console.error("Error saving CardCom response as webhook:", saveError);
                return new Response(
                  JSON.stringify({
                    success: false,
                    message: 'Error saving CardCom response',
                    error: saveError.message
                  }),
                  {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500
                  }
                );
              }
              
              // Process the newly created webhook
              const processResponse = await fetch(
                `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-webhook`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                  },
                  body: JSON.stringify({
                    webhookId: savedWebhook.id,
                    userId: userId
                  })
                }
              );
              
              const processResult = await processResponse.json();
              
              return new Response(
                JSON.stringify({
                  success: true,
                  message: 'Created and processed webhook from CardCom API data',
                  result: processResult,
                  userId: userId
                }),
                {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200
                }
              );
            } else {
              console.error(`CardCom API error: ${cardcomResponse.status} ${cardcomResponse.statusText}`);
            }
          } catch (e) {
            console.error("Error calling CardCom API:", e);
          }
        }
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `No webhooks found${email ? ' for email: ' + email : lowProfileId ? ' for lowProfileId: ' + lowProfileId : ''}`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Process each webhook
    const results = [];
    let tokenStatus = { found: false, saved: false };
    let successCount = 0;

    console.log(`Found ${webhooks.length} webhook(s) to process.`);

    for (const webhook of webhooks) {
      try {
        console.log(`Processing webhook ${webhook.id}`);
        
        // If userId is provided, update ReturnValue in payload to associate with the user
        if (userId && webhook.payload) {
          console.log(`Updating ReturnValue to ${userId} in webhook payload`);
          webhook.payload.ReturnValue = userId;
        }

        // Process the webhook by calling process-webhook function
        const processWebhookResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-webhook`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              webhookId: webhook.id,
              userId: userId
            }),
          }
        );

        const processResult = await processWebhookResponse.json();
        console.log(`Process result for webhook ${webhook.id}:`, processResult);
        
        // Check if webhook processing created a token
        if (userId) {
          const { data: tokenData } = await supabaseClient
            .from('recurring_payments')
            .select('token')
            .eq('user_id', userId)
            .maybeSingle();
            
          if (tokenData?.token) {
            console.log(`Token found for user ${userId}: ${tokenData.token}`);
            tokenStatus = { found: true, saved: true };
          }
        }
        
        results.push({
          webhookId: webhook.id,
          success: processResult.success,
          result: processResult,
        });

        // Count successful operations
        if (processResult.success) {
          successCount++;
        }

        // If this was successful, we can break after processing one webhook
        if (processResult.success) {
          break;
        }
      } catch (err) {
        console.error(`Error processing webhook ${webhook.id}:`, err);
        results.push({
          webhookId: webhook.id,
          success: false,
          error: err.message || String(err),
        });
      }
    }

    // Check if we successfully created or updated a subscription
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    const subscriptionCreated = !subscriptionError && !!subscriptionData;
    
    console.log(`Subscription check for user ${userId}:`, 
      subscriptionCreated ? `Found: ${subscriptionData?.id}` : "Not found");

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Processed ${webhooks.length} webhooks, ${successCount} successful`,
        results,
        tokenStatus,
        userId,
        subscriptionCreated,
        subscriptionId: subscriptionCreated ? subscriptionData?.id : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in reprocess-webhook-by-email:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error processing request',
        error: error.message || String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
