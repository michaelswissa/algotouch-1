
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
        throw new Error('Error checking payment_webhooks table: ' + tableCheckError.message);
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

    // Find unprocessed webhooks - using proper JSON query syntax
    let webhooks;
    let webhookError;
    
    if (lowProfileId) {
      // Filter by specific lowProfileId if provided
      ({ data: webhooks, error: webhookError } = await supabaseAdmin
        .from('payment_webhooks')
        .select('*')
        .eq('processed', false)
        .eq('payload->>LowProfileId', lowProfileId)
        .order('created_at', { ascending: false })
        .limit(5)
      );
    } else if (email) {
      try {
        // Try first query approach
        ({ data: webhooks, error: webhookError } = await supabaseAdmin
          .from('payment_webhooks')
          .select('*')
          .eq('processed', false)
          .or(`payload->'TranzactionInfo'->>'CardOwnerEmail' ILIKE '%${email}%',payload->'UIValues'->>'CardOwnerEmail' ILIKE '%${email}%'`)
          .order('created_at', { ascending: false })
          .limit(5)
        );
        
        if (webhookError) {
          console.log('First query approach failed, trying alternative:', webhookError);
          
          // Try alternative approach
          ({ data: webhooks, error: webhookError } = await supabaseAdmin
            .from('payment_webhooks')
            .select('*')
            .eq('processed', false)
            .order('created_at', { ascending: false })
            .limit(10)
          );
          
          // Manually filter by email
          if (!webhookError && webhooks) {
            webhooks = webhooks.filter((webhook: any) => {
              const payload = webhook.payload || {};
              const emailTranzaction = payload.TranzactionInfo?.CardOwnerEmail || '';
              const emailUI = payload.UIValues?.CardOwnerEmail || '';
              
              return emailTranzaction.toLowerCase().includes(email.toLowerCase()) || 
                    emailUI.toLowerCase().includes(email.toLowerCase());
            });
          }
        }
      } catch (jsonError) {
        console.error('JSON query syntax error:', jsonError);
        
        // Fallback to simpler query if JSON queries fail
        ({ data: webhooks, error: webhookError } = await supabaseAdmin
          .from('payment_webhooks')
          .select('*')
          .eq('processed', false)
          .order('created_at', { ascending: false })
          .limit(10)
        );
        
        // Manually filter results
        if (!webhookError && webhooks) {
          webhooks = webhooks.filter((webhook: any) => {
            try {
              const payload = webhook.payload || {};
              if (typeof payload === 'string') {
                try {
                  const parsedPayload = JSON.parse(payload);
                  const emailFields = [
                    parsedPayload.TranzactionInfo?.CardOwnerEmail,
                    parsedPayload.UIValues?.CardOwnerEmail
                  ];
                  return emailFields.some(e => e && e.toLowerCase().includes(email.toLowerCase()));
                } catch {
                  return false;
                }
              } else {
                const emailFields = [
                  payload.TranzactionInfo?.CardOwnerEmail,
                  payload.UIValues?.CardOwnerEmail
                ];
                return emailFields.some(e => e && e.toLowerCase().includes(email.toLowerCase()));
              }
            } catch {
              return false;
            }
          });
        }
      }
    }
    
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

    // If no unprocessed webhooks found and forceRefresh is true, sync subscription data anyway
    if ((!webhooks || webhooks.length === 0) && forceRefresh && userId) {
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
    
    // If no unprocessed webhooks found
    if (!webhooks || webhooks.length === 0) {
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
        try {
          // Try to find user by email
          const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers({
            filters: [{
              property: 'email',
              operator: 'eq',
              value: lookupEmail
            }]
          });
          
          if (userError) {
            console.error('Error finding user by email:', userError);
            continue;
          }
          
          if (users?.users?.length) {
            targetUserId = users.users[0].id;
          } else {
            console.error('No user found with email:', lookupEmail);
            continue;
          }
        } catch (userLookupError) {
          console.error('Error looking up user:', userLookupError);
          continue;
        }
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
    try {
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
        // Insert new token - with proper error handling for required fields
        const tokenExpiry = parseCardcomDateString(tokenInfo.TokenExDate || '20301231'); // Default to future date if missing
        
        const { error: tokenError } = await supabase
          .from('recurring_payments')
          .insert({
            user_id: userId,
            token: tokenInfo.Token,
            token_expiry: tokenExpiry,
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
    } catch (tokenStoreError) {
      console.error('Exception storing token:', tokenStoreError);
    }
  }
  
  // Update subscription with token if available
  if (tokenInfo?.Token) {
    try {
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
        const defaultPeriodEnd = calculatePeriodEnd(30); // Default to 30 days
        
        await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: 'monthly', // Default plan type
            status: responseCode === 0 ? 'active' : 'pending',
            token: tokenInfo.Token,
            payment_method: 'cardcom',
            current_period_ends_at: defaultPeriodEnd,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
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
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
    
  if (subError) {
    console.error('Error fetching subscription:', subError);
    return;
  }
    
  if (!subscription) {
    console.log(`No subscription found for user ${userId}, trying to create one`);
    
    // Try to find a valid token for this user
    const { data: recurringPayments } = await supabase
      .from('recurring_payments')
      .select('*')
      .eq('user_id', userId)
      .eq('is_valid', true)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (recurringPayments && recurringPayments.length > 0) {
      // Create a subscription using the available token
      const token = recurringPayments[0].token;
      const periodEnd = calculatePeriodEnd(30); // Default to 30 days
      
      const { error: createError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'monthly', // Default plan type
          status: 'active',
          token: token,
          payment_method: 'cardcom',
          current_period_ends_at: periodEnd,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (createError) {
        console.error('Error creating new subscription:', createError);
      } else {
        console.log('Created new subscription for user based on existing token');
      }
    }
    
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
    
    // Check user_payment_logs for any recent successful payments
    const { data: recentPayments } = await supabase
      .from('user_payment_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'payment_success')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (recentPayments && recentPayments.length > 0 && recentPayments[0].payment_data?.token_info?.token) {
      console.log('Found token in recent payment logs, creating missing recurring payment record');
      
      const tokenData = recentPayments[0].payment_data.token_info;
      const expiryDate = tokenData.expiry ? parseCardcomDateString(tokenData.expiry) : calculatePeriodEnd(365);
      
      // Create a recurring_payments record from payment log data
      await supabase
        .from('recurring_payments')
        .insert({
          user_id: userId,
          token: tokenData.token,
          token_expiry: expiryDate,
          token_approval_number: '',
          status: 'active',
          is_valid: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      // Update subscription with this token
      await supabase
        .from('subscriptions')
        .update({
          token: tokenData.token,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    }
    
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
