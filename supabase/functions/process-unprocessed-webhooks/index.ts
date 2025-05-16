
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Logger utility
const log = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error: any) => {
    console.error(`[ERROR] ${message}`, error);
  }
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

    // Get request parameters
    const { maxRetries = 3, ageInHours = 48, limit = 20 } = await req.json().catch(() => ({}));
    
    log.info(`Starting processing with maxRetries=${maxRetries}, ageInHours=${ageInHours}, limit=${limit}`);

    // Fetch unprocessed webhooks
    const { data: webhooks, error: fetchError } = await supabaseClient
      .from('payment_webhooks')
      .select('*')
      .eq('processed', false)
      .lt('processing_attempts', maxRetries)
      .gt('created_at', new Date(Date.now() - ageInHours * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch unprocessed webhooks: ${fetchError.message}`);
    }

    log.info(`Found ${webhooks?.length || 0} unprocessed webhooks`);

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No unprocessed webhooks to process', processed: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Process each webhook
    const results = [];
    for (const webhook of webhooks) {
      log.info(`Processing webhook ${webhook.id}`, { 
        webhook_type: webhook.webhook_type,
        attempts: webhook.processing_attempts
      });
      
      try {
        // Update the processing attempts
        await supabaseClient
          .from('payment_webhooks')
          .update({ processing_attempts: (webhook.processing_attempts || 0) + 1 })
          .eq('id', webhook.id);
        
        // Extract email and user ID information from the payload
        let userId = webhook.payload?.ReturnValue;
        const email = extractEmailFromPayload(webhook.payload);
        
        log.info(`Extracted information`, { userId, email });
        
        // If the user ID is not a valid UUID or doesn't exist, try to find a user by email
        if (!userId || !isValidUUID(userId) || userId.startsWith('temp_')) {
          if (email) {
            const { data: user } = await supabaseClient.auth.admin.listUsers({
              filter: { email }
            });
            
            if (user?.users && user.users.length > 0) {
              userId = user.users[0].id;
              log.info(`Found user by email: ${email}`, { userId });
              
              // Update the ReturnValue in the payload with the found userId
              webhook.payload.ReturnValue = userId;
              
              // Update the webhook payload
              await supabaseClient
                .from('payment_webhooks')
                .update({ payload: webhook.payload })
                .eq('id', webhook.id);
            } else {
              log.info(`No user found for email: ${email}`);
            }
          }
        }
        
        // Call the cardcom-webhook function to process the webhook
        const webhookResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify(webhook.payload)
          }
        );

        const webhookResult = await webhookResponse.json();
        
        log.info(`Webhook processing result for ${webhook.id}:`, webhookResult);

        // Mark webhook as processed if successful
        if (webhookResult.success) {
          await supabaseClient
            .from('payment_webhooks')
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              processing_result: {
                success: true,
                message: 'Automatically processed by scheduler',
                timestamp: new Date().toISOString()
              }
            })
            .eq('id', webhook.id);
            
          results.push({
            webhookId: webhook.id,
            email,
            userId,
            success: true,
            message: 'Successfully processed'
          });
        } else {
          // Log the failure
          results.push({
            webhookId: webhook.id,
            email,
            userId,
            success: false,
            message: webhookResult.message || 'Processing failed',
            error: webhookResult.error
          });
          
          // Update the processing result
          await supabaseClient
            .from('payment_webhooks')
            .update({
              processing_result: {
                success: false,
                message: webhookResult.message || 'Processing failed',
                error: webhookResult.error,
                timestamp: new Date().toISOString()
              }
            })
            .eq('id', webhook.id);
        }
      } catch (error) {
        log.error(`Error processing webhook ${webhook.id}:`, error);
        
        results.push({
          webhookId: webhook.id,
          success: false,
          message: 'Exception during processing',
          error: error.message || String(error)
        });
        
        // Update the processing result
        await supabaseClient
          .from('payment_webhooks')
          .update({
            processing_result: {
              success: false,
              message: 'Exception during processing',
              error: error.message || String(error),
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', webhook.id);
      }
    }

    // Summarize results
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    // Log the results to the system_logs table
    await supabaseClient
      .from('system_logs')
      .insert({
        level: 'INFO',
        function_name: 'process-unprocessed-webhooks',
        message: `Processed ${webhooks.length} webhooks: ${successful} successful, ${failed} failed`,
        details: {
          results,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${webhooks.length} webhooks: ${successful} successful, ${failed} failed`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    log.error('Error in webhook processor:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Error processing webhooks',
        error: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Helper function to extract email from webhook payload
function extractEmailFromPayload(payload: any): string | null {
  if (!payload) return null;
  
  // Check in TranzactionInfo
  if (payload.TranzactionInfo?.CardOwnerEmail) {
    return payload.TranzactionInfo.CardOwnerEmail;
  }
  
  // Check in UIValues
  if (payload.UIValues?.CardOwnerEmail) {
    return payload.UIValues.CardOwnerEmail;
  }
  
  return null;
}

// Helper function to check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
