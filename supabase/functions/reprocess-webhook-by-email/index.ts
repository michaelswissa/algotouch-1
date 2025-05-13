
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

    // Find user either by email or directly from provided userId
    let userId = providedUserId;
    
    if (!userId && email) {
      // Look up user by email
      const { data: userData, error: userError } = await supabaseClient
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        // Try with auth API instead
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.listUsers({
          filter: {
            email: email
          },
        });
        
        if (authError || !authUser?.users || authUser.users.length === 0) {
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
        
        userId = authUser.users[0].id;
      } else {
        userId = userData.id;
      }
    }

    // Find payment webhooks
    let webhookQuery = supabaseClient.from('payment_webhooks').select('*');
    
    if (lowProfileId) {
      webhookQuery = webhookQuery.filter('payload->LowProfileId', 'eq', lowProfileId);
    }
    
    const { data: webhooks, error: webhookError } = await webhookQuery.order('created_at', { ascending: false });

    if (webhookError) {
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

    for (const webhook of webhooks) {
      try {
        // If userId is provided, update ReturnValue in payload to associate with the user
        if (userId && webhook.payload) {
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
        
        // Check if webhook processing created a token
        if (userId) {
          const { data: tokenData } = await supabaseClient
            .from('recurring_payments')
            .select('token')
            .eq('user_id', userId)
            .maybeSingle();
            
          if (tokenData?.token) {
            tokenStatus = { found: true, saved: true };
          }
        }
        
        results.push({
          webhookId: webhook.id,
          success: processResult.success,
          result: processResult,
        });

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

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} webhooks`,
        results,
        tokenStatus,
        userId,
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
