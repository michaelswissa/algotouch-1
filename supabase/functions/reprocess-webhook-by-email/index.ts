
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  email?: string;
  lowProfileId?: string;
  userId?: string;
  forceRefresh?: boolean;
}

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Initialize Supabase client with service role (needed for admin operations)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Parse request
    const requestData: RequestBody = await req.json();
    const { email, lowProfileId, userId, forceRefresh } = requestData;
    
    if (!email && !lowProfileId && !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Must provide email, lowProfileId, or userId'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Processing webhook by email:', {
      email,
      lowProfileId,
      userId,
      forceRefresh
    });

    // Verify the payment_webhooks table exists before querying
    try {
      const { error: tableCheckError } = await supabaseAdmin
        .from('payment_webhooks')
        .select('id')
        .limit(1);
        
      if (tableCheckError) {
        console.error('Error checking payment_webhooks table:', tableCheckError);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Error checking payment_webhooks table: ' + tableCheckError.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (tableError) {
      console.error('Exception when checking payment_webhooks table:', tableError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Exception checking payment_webhooks table: ' + tableError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find unprocessed webhooks
    let webhookQuery = supabaseAdmin.from('payment_webhooks')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: false });
    
    // Filter by specific lowProfileId if provided
    if (lowProfileId) {
      webhookQuery = webhookQuery.filter('payload->LowProfileId', 'eq', lowProfileId);
    } 
    // Otherwise filter by email
    else if (email) {
      webhookQuery = webhookQuery.or(`(payload->'TranzactionInfo'->>'CardOwnerEmail')::text ILIKE '%${email}%',(payload->'UIValues'->>'CardOwnerEmail')::text ILIKE '%${email}%'`);
    }
    
    const { data: webhooks, error: webhookError } = await webhookQuery.limit(5);
        
    if (webhookError) {
      console.error('Error fetching webhooks:', webhookError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Error fetching webhooks: ' + webhookError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If no unprocessed webhooks found
    if (!webhooks || webhooks.length === 0) {
      console.log('No unprocessed webhooks found');
      
      // If forceRefresh is true, try to sync subscription data anyway
      if (forceRefresh && userId) {
        await syncSubscriptionData(supabaseAdmin, userId, email);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No unprocessed webhooks found but subscription data synced',
            webhooksProcessed: 0
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No unprocessed webhooks found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${webhooks.length} unprocessed webhooks`);
    
    // Process each webhook
    const results = [];
    for (const webhook of webhooks) {
      // Extract data from webhook
      const payload = webhook.payload;
      const webhookEmail = payload?.UIValues?.CardOwnerEmail || payload?.TranzactionInfo?.CardOwnerEmail || email;
      
      // Find the user based on email
      const lookupEmail = webhookEmail?.toLowerCase();
      let targetUserId = userId;
      
      if (!targetUserId && lookupEmail) {
        // Try to find user by email
        const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers({
          filters: [{
            property: 'email',
            operator: 'eq',
            value: lookupEmail
          }]
        });
        
        if (userError || !users?.users?.length) {
          console.error('Error finding user by email or no user found:', userError || 'No user found');
          continue;
        }
        
        targetUserId = users.users[0].id;
      }
      
      if (!targetUserId) {
        console.error('Could not determine target user ID');
        continue;
      }
      
      try {
        // Process the webhook for this user
        const result = await processWebhookForUser(supabaseAdmin, webhook, targetUserId);
        results.push(result);
        
        // Mark webhook as processed
        await supabaseAdmin
          .from('payment_webhooks')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            processing_result: {
              success: true,
              userId: targetUserId,
              email: webhookEmail
            }
          })
          .eq('id', webhook.id);
          
      } catch (processError) {
        console.error('Error processing webhook:', processError);
        results.push({
          success: false,
          webhook_id: webhook.id,
          error: processError.message
        });
      }
    }
    
    // If we processed any webhooks successfully, sync subscription data
    const anySuccess = results.some(r => r.success);
    if (anySuccess && userId) {
      await syncSubscriptionData(supabaseAdmin, userId, email);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.filter(r => r.success).length} webhooks successfully`,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in webhook reprocessing:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error processing webhooks: ${error.message}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processWebhookForUser(supabase: any, webhook: any, userId: string) {
  const payload = webhook.payload;
  const lowProfileId = payload.LowProfileId;
  const tokenInfo = payload.TokenInfo;
  const transactionInfo = payload.TranzactionInfo;
  const responseCode = payload.ResponseCode;
  
  console.log(`Processing webhook ${webhook.id} for user ${userId}`);
  
  // Check if this webhook has already been processed (duplicate check)
  const { data: existingPayment } = await supabase
    .from('user_payment_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('token', lowProfileId)
    .limit(1);
    
  if (existingPayment && existingPayment.length > 0) {
    console.log(`Payment already logged for this webhook (${lowProfileId})`);
  } else {
    // Log the payment
    const { error: logError } = await supabase
      .from('user_payment_logs')
      .insert({
        user_id: userId,
        token: lowProfileId,
        amount: transactionInfo?.Amount || 0,
        status: responseCode === 0 ? 'payment_success' : 'payment_failed',
        transaction_id: transactionInfo?.TranzactionId?.toString() || payload.TranzactionId?.toString(),
        payment_data: {
          operation: payload.Operation,
          response_code: responseCode,
          low_profile_id: lowProfileId,
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
  }
  
  // If we have token info, store it in recurring_payments
  if (tokenInfo && tokenInfo.Token) {
    const { data: existingToken } = await supabase
      .from('recurring_payments')
      .select('id')
      .eq('user_id', userId)
      .eq('token', tokenInfo.Token)
      .limit(1);
      
    if (existingToken && existingToken.length > 0) {
      console.log(`Token ${tokenInfo.Token} already exists for user ${userId}`);
      
      // Update token validity
      await supabase
        .from('recurring_payments')
        .update({
          is_valid: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingToken[0].id);
    } else {
      // Insert new token
      const { error: tokenError } = await supabase
        .from('recurring_payments')
        .insert({
          user_id: userId,
          token: tokenInfo.Token,
          token_expiry: parseCardcomDateString(tokenInfo.TokenExDate),
          token_approval_number: tokenInfo.TokenApprovalNumber || '',
          last_4_digits: transactionInfo?.Last4CardDigits || null,
          card_type: transactionInfo?.CardInfo || null,
          status: 'active',
          is_valid: true
        });
        
      if (tokenError) {
        console.error('Error storing token:', tokenError);
      } else {
        console.log('Token stored successfully');
      }
    }
  }
  
  // Update subscription with token if available
  if (tokenInfo?.Token) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (subscription) {
      await supabase
        .from('subscriptions')
        .update({
          token: tokenInfo.Token,
          status: responseCode === 0 ? 'active' : subscription.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    } else {
      // Create new subscription if none exists
      await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'monthly', // Default plan type
          status: responseCode === 0 ? 'active' : 'pending',
          token: tokenInfo.Token,
          payment_method: 'cardcom',
          current_period_ends_at: calculatePeriodEnd(30), // Default to 30 days
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
  }
  
  return {
    success: true,
    webhook_id: webhook.id,
    user_id: userId
  };
}

// Function to sync subscription data between tables
async function syncSubscriptionData(supabase: any, userId: string, email?: string) {
  console.log(`Syncing subscription data for user ${userId}`);
  
  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
    
  if (!subscription) {
    console.log(`No subscription found for user ${userId}`);
    return;
  }
  
  // Get recurring payment tokens
  const { data: recurringPayments } = await supabase
    .from('recurring_payments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_valid', true)
    .order('created_at', { ascending: false });
    
  if (!recurringPayments || recurringPayments.length === 0) {
    console.log(`No valid recurring payment tokens found for user ${userId}`);
    return;
  }
  
  const latestToken = recurringPayments[0];
  
  // Sync token to subscription if needed
  if (!subscription.token || subscription.token !== latestToken.token) {
    console.log(`Updating subscription with latest token ${latestToken.token}`);
    
    await supabase
      .from('subscriptions')
      .update({
        token: latestToken.token,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);
  }
  
  // Update current_period_ends_at if it's missing
  if (!subscription.current_period_ends_at) {
    console.log('Updating missing current_period_ends_at');
    
    // Default to 30 days from now
    const nextPeriodEnd = calculatePeriodEnd(30);
    
    await supabase
      .from('subscriptions')
      .update({
        current_period_ends_at: nextPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);
  }
}

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

// Helper function to calculate next period end date
function calculatePeriodEnd(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
