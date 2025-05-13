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
    // Create a Supabase client with service role
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
    const { email, lowProfileId } = await req.json();
    
    if (!email && !lowProfileId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Either email or lowProfileId is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // If email is provided, first find the user ID
    let userId = null;
    if (email) {
      console.log(`Looking up user by email: ${email}`);
      
      // Get user by email through the dedicated function
      const { data: userData, error: userError } = await supabaseClient.functions.invoke('get-user-by-email', {
        body: { email: email.toLowerCase() }
      });
      
      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Could not find user with the provided email',
            error: userError?.message || 'User not found'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }

      userId = userData.user.id;
      console.log(`Found user ID: ${userId}`);
    }

    // Find webhooks that might apply to this user
    let query = supabaseClient
      .from('payment_webhooks')
      .select('*')
      .eq('webhook_type', 'cardcom');
      
    // If we have a specific lowProfileId, use that as the primary filter
    if (lowProfileId) {
      query = query.filter('payload->LowProfileId', 'eq', lowProfileId);
    }
    // Otherwise if we have an email, use that to find related webhooks
    else if (email) {
      query = query.filter('payload->UIValues->CardOwnerEmail', 'ilike', email);
    }
    
    const { data: webhooks, error: webhookError } = await query
      .order('created_at', { ascending: false });

    if (webhookError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Error searching for webhooks',
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
          message: 'No matching webhooks found',
          filters: { email, lowProfileId }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    console.log(`Found ${webhooks.length} webhooks to reprocess`);

    // For each webhook, call the cardcom-webhook function with the payload
    // But potentially override the ReturnValue with the user ID we found
    const results = [];
    for (const webhook of webhooks) {
      console.log(`Reprocessing webhook ID: ${webhook.id}`);
      
      // Create a copy of the payload so we don't modify the original
      const payloadCopy = JSON.parse(JSON.stringify(webhook.payload));
      
      // If we have a user ID and the webhook payload has TokenInfo, 
      // override the ReturnValue to ensure it processes for the right user
      if (userId && payloadCopy.TokenInfo && payloadCopy.TokenInfo.Token) {
        console.log(`Overriding ReturnValue with user ID: ${userId}`);
        payloadCopy.ReturnValue = userId;
      }
      
      // Call the cardcom-webhook function with this payload
      const response = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify(payloadCopy)
        }
      );
      
      const responseJson = await response.json();
      
      // Add to results
      results.push({
        webhookId: webhook.id,
        response: responseJson,
        status: response.status,
        success: response.ok
      });
      
      // Update the webhook record to show it was reprocessed
      await supabaseClient
        .from('payment_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_result: {
            reprocessed: true,
            reprocessedAt: new Date().toISOString(),
            success: response.ok,
            response: responseJson
          }
        })
        .eq('id', webhook.id);
    }

    // Now verify if we have created tokens in recurring_payments
    let tokenStatus = { found: false, tokenData: null };
    if (userId) {
      const { data: tokens, error: tokenError } = await supabaseClient
        .from('recurring_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (!tokenError && tokens && tokens.length > 0) {
        tokenStatus = {
          found: true,
          tokenData: tokens[0]
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reprocessed ${results.length} webhooks`,
        results,
        tokenStatus
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error reprocessing webhooks:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error reprocessing webhooks',
        error: error.message || String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
