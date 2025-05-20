
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

// No auth verification needed for webhooks
serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Setup logging and tracking variables
  const processingStartTime = Date.now();
  const requestId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  let logData = {};
  
  try {
    // Create a Supabase client with service role (since this is a webhook)
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
    const payload = await req.json();
    
    console.log(`[${requestId}] Received webhook notification:`, JSON.stringify(payload));
    
    // Update logging info
    logData = {
      requestId,
      payloadType: typeof payload,
      hasLowProfileId: !!payload?.LowProfileId,
      hasReturnValue: !!payload?.ReturnValue,
      hasOperation: !!payload?.Operation,
      hasResponseCode: payload?.ResponseCode !== undefined
    };
    
    // Log the webhook data in Supabase with retry logic
    let logError = null;
    for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
      try {
        const { error } = await supabaseClient
          .from('payment_webhooks')
          .insert({
            webhook_type: 'cardcom',
            payload: payload,
            processed: false
          });
          
        logError = error;
        if (!error) break; // Success, exit retry loop
        
        console.error(`[${requestId}] Error logging webhook (attempt ${attempt}/${MAX_DB_RETRIES}):`, error);
        if (attempt < MAX_DB_RETRIES) {
          // Wait with exponential backoff before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (e) {
        console.error(`[${requestId}] Exception when logging webhook (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
        logError = e;
        if (attempt < MAX_DB_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    if (logError) {
      console.error(`[${requestId}] Failed to log webhook after ${MAX_DB_RETRIES} attempts:`, logError);
    }
    
    // Process the webhook based on the payload data
    // CardCom webhook contains information about the transaction
    const { 
      ResponseCode, 
      LowProfileId, 
      TranzactionId, 
      ReturnValue,
      TokenInfo,
      TranzactionInfo,
      UIValues,
      Operation 
    } = payload;
    
    // Log the webhook data details
    console.log(`[${requestId}] Processing webhook data:`, {
      ResponseCode,
      LowProfileId,
      TranzactionId,
      ReturnValue,
      hasTokenInfo: !!TokenInfo,
      hasTranzactionInfo: !!TranzactionInfo,
      hasUIValues: !!UIValues,
      Operation
    });

    let processingResult = {
      success: false,
      message: 'Not processed',
      details: null
    };

    // Only process successful transactions
    if (ResponseCode === 0) {
      try {
        // Validate token information if this is a token operation
        if ((Operation === "ChargeAndCreateToken" || Operation === "CreateTokenOnly") && !TokenInfo?.Token) {
          console.error(`[${requestId}] Token operation missing required TokenInfo.Token:`, Operation);
          processingResult = {
            success: false, 
            message: 'Missing required token information for token operation',
            details: { operation: Operation }
          };
        } else if (ReturnValue) {
          // IMPROVED ReturnValue Format Handling
          // 1. Check for UUID format
          const isUuid = isValidUuid(ReturnValue);
          
          // 2. Check for temp registration formats with different prefixes
          const isTempReg = ReturnValue.startsWith('temp_reg_');
          const isLegacyTemp = ReturnValue.startsWith('temp_') && !ReturnValue.startsWith('temp_reg_');
          
          console.log(`[${requestId}] ReturnValue format analysis:`, {
            ReturnValue,
            isUuid,
            isTempReg,
            isLegacyTemp
          });
          
          if (isTempReg || isLegacyTemp) {
            // Handle as temporary registration - extract actual ID from any temp format
            let actualRegistrationId;
            
            if (isTempReg) {
              actualRegistrationId = ReturnValue.substring(9); // Remove 'temp_reg_' prefix
            } else {
              actualRegistrationId = ReturnValue.substring(5); // Remove 'temp_' prefix
            }
            
            console.log(`[${requestId}] Processing registration payment with extracted ID:`, actualRegistrationId);
            
            // Process the registration with retry logic
            let processSuccess = false;
            let processError = null;
            
            for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
              try {
                await processRegistrationPayment(supabaseClient, ReturnValue, payload, requestId);
                processSuccess = true;
                break; // Success, exit retry loop
              } catch (e) {
                processError = e;
                console.error(`[${requestId}] Error processing registration payment (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                if (attempt < MAX_DB_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              }
            }
            
            if (!processSuccess) {
              console.error(`[${requestId}] Failed to process registration after ${MAX_DB_RETRIES} attempts:`, processError);
              processingResult = {
                success: false,
                message: `Failed to process registration: ${processError?.message || 'Unknown error'}`,
                details: { registrationId: ReturnValue, error: processError }
              };
            } else {
              processingResult = { 
                success: true, 
                message: 'Processed registration payment', 
                details: { registrationId: ReturnValue, format: isTempReg ? 'new_format' : 'legacy_format' }
              };
            }
          } else if (isUuid) {
            // This is a UUID - process as user payment
            let processSuccess = false;
            let processError = null;
            
            for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
              try {
                await processUserPayment(supabaseClient, ReturnValue, payload, requestId);
                processSuccess = true;
                break; // Success, exit retry loop  
              } catch (e) {
                processError = e;
                console.error(`[${requestId}] Error processing user payment (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                if (attempt < MAX_DB_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              }
            }
            
            if (!processSuccess) {
              console.error(`[${requestId}] Failed to process user payment after ${MAX_DB_RETRIES} attempts:`, processError);
              processingResult = {
                success: false,
                message: `Failed to process user payment: ${processError?.message || 'Unknown error'}`,
                details: { userId: ReturnValue, error: processError }
              };
            } else {
              processingResult = { 
                success: true, 
                message: 'Processed user payment', 
                details: { userId: ReturnValue }
              };
            }
          } else {
            // Fallback to email lookup if ReturnValue is not recognized
            if (UIValues && UIValues.CardOwnerEmail) {
              const email = UIValues.CardOwnerEmail;
              console.log(`[${requestId}] Attempting to find user by email:`, email);
              
              // Try email lookup with retry logic
              let emailLookupSuccess = false;
              
              for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
                try {
                  // Call get-user-by-email function to look up user
                  const { data: userData, error: userError } = await supabaseClient.functions.invoke('get-user-by-email', {
                    body: { email: email.toLowerCase() }
                  });

                  if (!userError && userData?.user?.id) {
                    const userId = userData.user.id;
                    console.log(`[${requestId}] Found user with email ${email}, ID: ${userId}`);
                    
                    // Process as a regular user payment
                    await processUserPayment(supabaseClient, userId, payload, requestId);
                    processingResult = { 
                      success: true, 
                      message: 'Processed user payment via email lookup', 
                      details: { userId, email }
                    };
                    emailLookupSuccess = true;
                    break;
                  } else {
                    console.log(`[${requestId}] No user found with email ${email} using get-user-by-email function`);
                    
                    // Direct lookup in auth.users table as fallback
                    try {
                      const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers({
                        filters: [
                          {
                            property: 'email',
                            operator: 'eq',
                            value: email.toLowerCase()
                          }
                        ]
                      });

                      if (!authError && authUsers?.users && authUsers.users.length > 0) {
                        const userId = authUsers.users[0].id;
                        console.log(`[${requestId}] Found user with email ${email} directly in auth.users, ID: ${userId}`);
                        
                        // Process as a regular user payment
                        await processUserPayment(supabaseClient, userId, payload, requestId);
                        processingResult = { 
                          success: true, 
                          message: 'Processed user payment via direct auth.users lookup', 
                          details: { userId, email }
                        };
                        emailLookupSuccess = true;
                        break;
                      } else {
                        console.log(`[${requestId}] No user found with email ${email} in auth.users (attempt ${attempt}/${MAX_DB_RETRIES})`);
                        if (attempt < MAX_DB_RETRIES) {
                          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        }
                      }
                    } catch (e) {
                      console.error(`[${requestId}] Error during auth.users lookup (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                      if (attempt < MAX_DB_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                      }
                    }
                  }
                } catch (e) {
                  console.error(`[${requestId}] Error during email lookup (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                  if (attempt < MAX_DB_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                  }
                }
              }
              
              if (!emailLookupSuccess) {
                console.error(`[${requestId}] User not found by email after ${MAX_DB_RETRIES} attempts:`, email);
                processingResult = {
                  success: false,
                  message: 'User not found by email via any method',
                  details: { ReturnValue, email }
                };
              }
            } else {
              console.error(`[${requestId}] Invalid ReturnValue and no email to look up user:`, ReturnValue);
              processingResult = {
                success: false,
                message: 'Invalid ReturnValue and no email available',
                details: { ReturnValue }
              };
            }
          }
        } else {
          // No ReturnValue, try to use email
          if (UIValues && UIValues.CardOwnerEmail) {
            const email = UIValues.CardOwnerEmail;
            console.log(`[${requestId}] No ReturnValue. Attempting to find user by email:`, email);
            
            // Try email lookup with retry logic
            let emailLookupSuccess = false;
            
            for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
              try {
                // Call get-user-by-email function to look up user
                const { data: userData, error: userError } = await supabaseClient.functions.invoke('get-user-by-email', {
                  body: { email: email.toLowerCase() }
                });

                if (!userError && userData?.user?.id) {
                  const userId = userData.user.id;
                  console.log(`[${requestId}] Found user with email ${email}, ID: ${userId}`);
                  
                  // Process as a regular user payment
                  await processUserPayment(supabaseClient, userId, payload, requestId);
                  processingResult = { 
                    success: true, 
                    message: 'Processed user payment via email lookup', 
                    details: { userId, email }
                  };
                  emailLookupSuccess = true;
                  break;
                } else {
                  console.log(`[${requestId}] No user found with email ${email} using get-user-by-email function (attempt ${attempt}/${MAX_DB_RETRIES})`);
                  
                  // Direct lookup in auth.users table as fallback
                  try {
                    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers({
                      filters: [
                        {
                          property: 'email',
                          operator: 'eq',
                          value: email.toLowerCase()
                        }
                      ]
                    });

                    if (!authError && authUsers?.users && authUsers.users.length > 0) {
                      const userId = authUsers.users[0].id;
                      console.log(`[${requestId}] Found user with email ${email} directly in auth.users, ID: ${userId}`);
                      
                      // Process as a regular user payment
                      await processUserPayment(supabaseClient, userId, payload, requestId);
                      processingResult = { 
                        success: true, 
                        message: 'Processed user payment via direct auth.users lookup', 
                        details: { userId, email }
                      };
                      emailLookupSuccess = true;
                      break;
                    }
                  } catch (e) {
                    console.error(`[${requestId}] Error during auth.users lookup (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                  }
                  
                  if (attempt < MAX_DB_RETRIES && !emailLookupSuccess) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                  }
                }
              } catch (e) {
                console.error(`[${requestId}] Error during email lookup (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
                if (attempt < MAX_DB_RETRIES) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              }
            }
            
            if (!emailLookupSuccess) {
              console.error(`[${requestId}] User not found by email after ${MAX_DB_RETRIES} attempts:`, email);
              processingResult = {
                success: false,
                message: 'User not found by email via any method',
                details: { email }
              };
            }
          } else {
            console.error(`[${requestId}] No ReturnValue and no email to look up user`);
            processingResult = {
              success: false,
              message: 'No ReturnValue and no email available',
              details: null
            };
          }
        }
      } catch (processingError) {
        console.error(`[${requestId}] Error during webhook processing:`, processingError);
        processingResult = {
          success: false,
          message: 'Error during webhook processing',
          details: { error: processingError.message }
        };
      }
    } else {
      // Failed transaction
      processingResult = {
        success: false,
        message: `Transaction failed with code ${ResponseCode}`,
        details: { ResponseCode, Description: payload.Description }
      };
    }

    // Mark webhook as processed and store the result (with retries)
    if (payload && payload.LowProfileId) {
      for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
        try {
          // Find the webhook we just logged
          const { data: webhooks, error: findError } = await supabaseClient
            .from('payment_webhooks')
            .select('id')
            .eq('payload->LowProfileId', payload.LowProfileId)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (findError) {
            console.error(`[${requestId}] Error finding webhook (attempt ${attempt}/${MAX_DB_RETRIES}):`, findError);
            if (attempt < MAX_DB_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
            break;
          }
          
          if (webhooks && webhooks.length > 0) {
            const webhookId = webhooks[0].id;
            const { error: updateError } = await supabaseClient
              .from('payment_webhooks')
              .update({ 
                processed: true,
                processed_at: new Date().toISOString(),
                processing_result: processingResult
              })
              .eq('id', webhookId);
              
            if (updateError) {
              console.error(`[${requestId}] Error updating webhook (attempt ${attempt}/${MAX_DB_RETRIES}):`, updateError);
              if (attempt < MAX_DB_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
              }
            } else {
              console.log(`[${requestId}] Successfully marked webhook ${webhookId} as processed`);
              break;
            }
          } else {
            console.error(`[${requestId}] No webhook found for LowProfileId: ${payload.LowProfileId}`);
            break;
          }
        } catch (e) {
          console.error(`[${requestId}] Exception when updating webhook (attempt ${attempt}/${MAX_DB_RETRIES}):`, e);
          if (attempt < MAX_DB_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    }

    // Calculate total processing time
    const processingTime = Date.now() - processingStartTime;
    console.log(`[${requestId}] Webhook processing completed in ${processingTime}ms with result:`, processingResult);

    // Acknowledge receipt of webhook
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received and processed',
        processingResult,
        processingTime,
        requestId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    const processingTime = Date.now() - processingStartTime;
    console.error(`[${requestId}] Error processing webhook (${processingTime}ms):`, error);
    
    // Still return 200 to acknowledge receipt (webhook best practice)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error processing webhook',
        error: error.message,
        requestId,
        processingTime,
        logData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Always return 200 for webhooks
      }
    );
  }
});

// Process payment for registered user
async function processUserPayment(supabase: any, userId: string, payload: any, requestId: string = 'none') {
  console.log(`[${requestId}] Processing payment for user: ${userId}`);
  
  // Extract token information if available
  const tokenInfo = payload.TokenInfo;
  const transactionInfo = payload.TranzactionInfo;
  const operation = payload.Operation;

  // Update user's subscription status
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      status: (operation === "CreateTokenOnly") ? 'trial' : 'active',
      payment_method: 'cardcom',
      last_payment_date: new Date().toISOString(),
      // If we have token information and it's a ChargeAndCreateToken or CreateTokenOnly operation
      // then store the token in the payment_method column
      payment_details: {
        transaction_id: payload.TranzactionId,
        low_profile_id: payload.LowProfileId,
        amount: transactionInfo?.Amount || payload.Amount || 0,
        response_code: payload.ResponseCode,
        operation: operation,
        card_info: transactionInfo ? {
          last4: transactionInfo.Last4CardDigits,
          expiry: `${transactionInfo.CardMonth}/${transactionInfo.CardYear}`,
          card_name: transactionInfo.CardName,
          card_type: transactionInfo.CardInfo
        } : null,
        token_info: tokenInfo ? {
          token: tokenInfo.Token,
          expiry: tokenInfo.TokenExDate,
          approval: tokenInfo.TokenApprovalNumber
        } : null
      }
    });
  
  if (error) {
    console.error(`[${requestId}] Error updating user subscription:`, error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  // If we have token info, store it in recurring_payments table
  if (tokenInfo && tokenInfo.Token) {
    console.log(`[${requestId}] Storing token for user: ${userId}, token: ${tokenInfo.Token}`);
    
    try {
      // Ensure all required fields are present and valid
      if (!tokenInfo.TokenExDate) {
        throw new Error('Missing TokenExDate in token information');
      }
      
      // Save the token to recurring_payments
      const { error: tokenError } = await supabase
        .from('recurring_payments')
        .insert({
          user_id: userId,
          token: tokenInfo.Token,
          token_expiry: parseCardcomDateString(tokenInfo.TokenExDate),
          token_approval_number: tokenInfo.TokenApprovalNumber || '', // Ensure it's never null
          last_4_digits: transactionInfo?.Last4CardDigits || null,
          card_type: transactionInfo?.CardInfo || null,
          status: 'active',
          is_valid: true
        });
        
      if (tokenError) {
        console.error(`[${requestId}] Error storing token:`, tokenError);
        throw new Error(`Failed to store token: ${tokenError.message}`);
      } else {
        console.log(`[${requestId}] Token stored successfully`);
      }
    } catch (tokenSaveError) {
      console.error(`[${requestId}] Error in token storage:`, tokenSaveError);
      throw tokenSaveError;
    }
  } else if (payload.ResponseCode === 0 && (operation === "ChargeAndCreateToken" || operation === "CreateTokenOnly")) {
    console.error(`[${requestId}] Missing TokenInfo in successful token operation`, { operation, ResponseCode: payload.ResponseCode });
  }

  // Log the payment in user_payment_logs
  try {
    const { error: logError } = await supabase
      .from('user_payment_logs')
      .insert({
        user_id: userId,
        subscription_id: userId, // Using user_id as subscription_id as per existing pattern
        token: payload.LowProfileId,
        amount: transactionInfo?.Amount || payload.Amount || 0,
        status: payload.ResponseCode === 0 ? 'payment_success' : 'payment_failed',
        transaction_id: payload.TranzactionId?.toString() || null,
        payment_data: {
          operation: operation,
          response_code: payload.ResponseCode,
          low_profile_id: payload.LowProfileId,
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
      console.error(`[${requestId}] Error logging payment:`, logError);
    }
  } catch (logSaveError) {
    console.error(`[${requestId}] Error in payment logging:`, logSaveError);
  }
}

// Process payment for temporary registration
async function processRegistrationPayment(supabase: any, regId: string, payload: any, requestId: string = 'none') {
  console.log(`[${requestId}] Processing payment for registration: ${regId}`);
  
  // Extract the registration ID, handling different formats
  let actualId;
  
  if (regId.startsWith('temp_reg_')) {
    actualId = regId.substring(9); // Remove 'temp_reg_' prefix
  } else if (regId.startsWith('temp_')) {
    actualId = regId.substring(5); // Remove 'temp_' prefix
  } else {
    actualId = regId; // Use as-is if no recognized prefix
  }
  
  console.log(`[${requestId}] Extracted registration ID: ${actualId} from ${regId}`);
  
  // First, try updating with the exact ID
  try {
    const { error } = await supabase
      .from('temp_registration_data')
      .update({ 
        payment_verified: true,
        payment_details: {
          transaction_id: payload.TranzactionId,
          low_profile_id: payload.LowProfileId,
          amount: payload.Amount,
          response_code: payload.ResponseCode,
          card_info: payload.TranzactionInfo ? {
            last4: payload.TranzactionInfo.Last4CardDigits,
            expiry: `${payload.TranzactionInfo.CardMonth}/${payload.TranzactionInfo.CardYear}`
          } : null,
          token_info: payload.TokenInfo ? {
            token: payload.TokenInfo.Token,
            expiry: payload.TokenInfo.TokenExDate,
            approval: payload.TokenInfo.TokenApprovalNumber
          } : null
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', actualId);
  
    if (!error) {
      console.log(`[${requestId}] Successfully updated registration with ID: ${actualId}`);
      return;
    }
    
    // If we couldn't find the record with the exact ID, try alternative approaches
    console.error(`[${requestId}] Error updating registration payment status with exact ID:`, error);
    
    // Try to find registration by partial match (using full regId)
    const { data: regByFullId, error: fullIdError } = await supabase
      .from('temp_registration_data')
      .select('id, registration_data')
      .filter('id', 'ilike', `%${regId}%`)
      .limit(1);
    
    if (!fullIdError && regByFullId && regByFullId.length > 0) {
      // Found a matching registration using full ID
      const matchedRegId = regByFullId[0].id;
      console.log(`[${requestId}] Found matching registration with full regId ${regId}, matched ID: ${matchedRegId}`);
      
      // Update the found registration
      const { error: updateError } = await supabase
        .from('temp_registration_data')
        .update({ 
          payment_verified: true,
          payment_details: {
            transaction_id: payload.TranzactionId,
            low_profile_id: payload.LowProfileId,
            amount: payload.Amount,
            response_code: payload.ResponseCode,
            card_info: payload.TranzactionInfo ? {
              last4: payload.TranzactionInfo.Last4CardDigits,
              expiry: `${payload.TranzactionInfo.CardMonth}/${payload.TranzactionInfo.CardYear}`
            } : null,
            token_info: payload.TokenInfo ? {
              token: payload.TokenInfo.Token,
              expiry: payload.TokenInfo.TokenExDate,
              approval: payload.TokenInfo.TokenApprovalNumber
            } : null
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', matchedRegId);
        
      if (updateError) {
        console.error(`[${requestId}] Error updating matched registration with full regId:`, updateError);
        throw new Error(`Failed to update registration: ${updateError.message}`);
      }
      
      console.log(`[${requestId}] Successfully updated registration with full regId match`);
      return;
    }
    
    // Try to find registration by partial match (without prefix, using actualId)
    const { data: regData, error: searchError } = await supabase
      .from('temp_registration_data')
      .select('id, registration_data')
      .filter('id', 'ilike', `%${actualId.substring(0, 8)}%`)
      .limit(1);
    
    if (!searchError && regData && regData.length > 0) {
      // Found a matching registration using partial ID match
      const matchedRegId = regData[0].id;
      console.log(`[${requestId}] Found matching registration with partial ID from ${actualId}, matched ID: ${matchedRegId}`);
      
      // Update the found registration
      const { error: updateError } = await supabase
        .from('temp_registration_data')
        .update({ 
          payment_verified: true,
          payment_details: {
            transaction_id: payload.TranzactionId,
            low_profile_id: payload.LowProfileId,
            amount: payload.Amount,
            response_code: payload.ResponseCode,
            card_info: payload.TranzactionInfo ? {
              last4: payload.TranzactionInfo.Last4CardDigits,
              expiry: `${payload.TranzactionInfo.CardMonth}/${payload.TranzactionInfo.CardYear}`
            } : null,
            token_info: payload.TokenInfo ? {
              token: payload.TokenInfo.Token,
              expiry: payload.TokenInfo.TokenExDate,
              approval: payload.TokenInfo.TokenApprovalNumber
            } : null
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', matchedRegId);
        
      if (updateError) {
        console.error(`[${requestId}] Error updating matched registration with partial ID:`, updateError);
        throw updateError;
      }
      
      console.log(`[${requestId}] Successfully updated registration with partial ID match`);
      return;
    }
    
    // Still can't find any matching registration, create a new one
    if (payload.UIValues && payload.UIValues.CardOwnerEmail) {
      console.log(`[${requestId}] Creating new temp registration with email:`, payload.UIValues.CardOwnerEmail);
      
      // Use a valid UUID for the ID
      const newId = crypto.randomUUID();
      
      // Create a new registration record with the email from the payload
      const { error: insertError } = await supabase
        .from('temp_registration_data')
        .insert({
          id: newId,
          registration_data: {
            email: payload.UIValues.CardOwnerEmail,
            userData: {
              fullName: payload.UIValues.CardOwnerName || '',
              phone: payload.UIValues.CardOwnerPhone || '',
              idNumber: payload.UIValues.CardOwnerIdentityNumber || ''
            },
            paymentToken: payload.TokenInfo ? {
              token: payload.TokenInfo.Token,
              expiry: payload.TokenInfo.TokenExDate,
              last4Digits: payload.TranzactionInfo?.Last4CardDigits || ''
            } : null,
            registrationTime: new Date().toISOString(),
            originalId: regId  // Store the original ID for reference
          },
          payment_verified: true,
          payment_details: {
            transaction_id: payload.TranzactionId,
            low_profile_id: payload.LowProfileId,
            amount: payload.Amount,
            response_code: payload.ResponseCode,
            operation: payload.Operation,
            originalId: regId  // Store the original ID for reference
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
        
      if (insertError) {
        console.error(`[${requestId}] Error creating new registration:`, insertError);
        throw new Error(`Failed to create new registration: ${insertError.message}`);
      }
      
      console.log(`[${requestId}] Successfully created new registration with ID ${newId} for original ID ${regId}`);
      return;
    } else {
      // No way to create a registration without email
      throw new Error(`Could not find matching registration for ID ${regId} and no email to create a new one`);
    }
  } catch (error) {
    console.error(`[${requestId}] Error processing registration payment:`, error);
    throw error;
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

// Helper function to validate UUID format
function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
