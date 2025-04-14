
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Received webhook callback from Cardcom');
    
    const webhookData = await req.json();
    console.log('Webhook data:', JSON.stringify(webhookData));
    
    // Check if this is a valid webhook notification
    if (!webhookData || !webhookData.LowProfileId) {
      throw new Error('Invalid webhook data: Missing LowProfileId');
    }
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // First check if we've already processed this payment
    const { data: existingPayment } = await supabaseClient
      .from('user_payment_logs')
      .select('id, status')
      .eq('token', webhookData.LowProfileId)
      .maybeSingle();
      
    if (existingPayment && existingPayment.status === 'completed') {
      console.log(`Payment ${webhookData.LowProfileId} has already been processed`);
      return new Response(
        JSON.stringify({ success: true, status: 'already_processed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Update existing payment log if it exists, but wasn't completed
    if (existingPayment) {
      console.log(`Found existing payment log ${existingPayment.id}, updating...`);
    }
    
    // Check if this is a successful transaction
    let isSuccessful = false;
    if (
      webhookData.OperationResponse === '0' ||
      webhookData.ResponseCode === 0 ||
      (webhookData.TranzactionInfo && webhookData.TranzactionInfo.ResponseCode === 0)
    ) {
      isSuccessful = true;
    }
    
    console.log(`Transaction status: ${isSuccessful ? 'Successful' : 'Failed'}`);
    
    // Check if this payment is associated with a payment session
    const { data: paymentSession } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .filter('payment_details->lowProfileId', 'eq', webhookData.LowProfileId)
      .maybeSingle();
      
    if (paymentSession) {
      console.log('Found associated payment session:', paymentSession.id);
      
      // Check if this was a registration flow
      const registrationData = paymentSession.payment_details?.registrationData;
      const planId = paymentSession.payment_details?.planId || paymentSession.plan_id;
      const userId = paymentSession.user_id;
      
      if (isSuccessful) {
        if (registrationData && !userId) {
          // This was a registration flow
          console.log('Processing registration payment');
          
          try {
            // Save contract signature if available
            if (registrationData.contractDetails || paymentSession.payment_details?.contractDetails) {
              const contractDetails = registrationData.contractDetails || paymentSession.payment_details?.contractDetails;
              console.log('Saving contract signature from registration data');
              
              // Verify contract data for fields
              if (contractDetails && contractDetails.signature) {
                const { error: contractError } = await supabaseClient
                  .from('contract_signatures')
                  .insert({
                    plan_id: planId,
                    full_name: contractDetails.fullName || 
                      `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim() || 'Customer',
                    email: registrationData.email,
                    phone: registrationData.userData?.phone,
                    signature: contractDetails.signature,
                    contract_html: contractDetails.contractHtml,
                    contract_version: contractDetails.contractVersion || '1.0',
                    agreed_to_terms: contractDetails.agreedToTerms || false,
                    agreed_to_privacy: contractDetails.agreedToPrivacy || false,
                    browser_info: contractDetails.browserInfo || {},
                    user_id: userId || null // Will be updated after user creation
                  });
                  
                if (contractError) {
                  console.error('Error saving contract signature:', contractError);
                } else {
                  console.log('Contract signature saved successfully');
                }
              } else {
                console.log('Contract data missing required fields (signature)');
              }
            }
            
            // Record payment (even without user)
            await supabaseClient
              .from('user_payment_logs')
              .insert({
                token: webhookData.LowProfileId,
                status: 'completed',
                amount: paymentSession.payment_details?.amount || webhookData.TranzactionInfo?.Amount || 0,
                transaction_details: {
                  webhookData,
                  paymentSession: paymentSession.id,
                  planId
                }
              });
              
          } catch (err) {
            console.error('Error processing registration payment:', err);
          }
        } else if (userId) {
          // This was a payment for an existing user
          console.log('Processing existing user payment for user:', userId);
          
          // Get current date
          const now = new Date();
          
          // Prepare subscription data
          let subscriptionData: any = {
            user_id: userId,
            plan_type: planId,
            status: planId === 'monthly' ? 'trial' : 'active',
            payment_method: webhookData.UIValues || {},
            updated_at: now.toISOString()
          };
          
          // Set contract signed data if available in payment_details
          if (paymentSession.payment_details?.contractDetails || 
              paymentSession.payment_details?.contractSigned) {
            subscriptionData.contract_signed = true;
            subscriptionData.contract_signed_at = paymentSession.payment_details.contractSignedAt || now.toISOString();
          }
          
          // Set appropriate dates based on plan
          if (planId === 'monthly') {
            // Trial period - 1 month
            const trialEnd = new Date(now);
            trialEnd.setMonth(trialEnd.getMonth() + 1);
            subscriptionData.trial_ends_at = trialEnd.toISOString();
            subscriptionData.next_charge_date = trialEnd.toISOString();
          } else if (planId === 'annual') {
            // Annual subscription - 1 year
            const yearEnd = new Date(now);
            yearEnd.setFullYear(yearEnd.getFullYear() + 1);
            subscriptionData.current_period_ends_at = yearEnd.toISOString();
            subscriptionData.next_charge_date = yearEnd.toISOString();
          } else if (planId === 'vip') {
            // VIP subscription - lifetime
            subscriptionData.current_period_ends_at = null;
            subscriptionData.next_charge_date = null;
          }
          
          // Update or create subscription
          const { error: subscriptionError } = await supabaseClient
            .from('subscriptions')
            .upsert(subscriptionData);
            
          if (subscriptionError) {
            console.error('Error updating subscription:', subscriptionError);
          } else {
            console.log('Subscription updated successfully for user:', userId);
          }
          
          // Record the payment
          const paymentLogData = {
            user_id: userId,
            token: webhookData.LowProfileId,
            status: 'completed',
            amount: paymentSession.payment_details?.amount || webhookData.TranzactionInfo?.Amount || 0,
            approval_code: webhookData.TranzactionInfo?.ApprovalNumber || null,
            transaction_details: webhookData
          };

          if (existingPayment) {
            await supabaseClient
              .from('user_payment_logs')
              .update(paymentLogData)
              .eq('id', existingPayment.id);
          } else {
            await supabaseClient
              .from('user_payment_logs')
              .insert(paymentLogData);
          }
          
          console.log('Payment logged successfully');
          
          // If there was a contract in the payment details, save it
          if (paymentSession.payment_details?.contractDetails) {
            const contractDetails = paymentSession.payment_details.contractDetails;
            console.log('Saving contract signature from payment_details');
            
            // First check if contract already exists
            const { data: existingContract } = await supabaseClient
              .from('contract_signatures')
              .select('id')
              .eq('user_id', userId)
              .eq('plan_id', planId)
              .maybeSingle();
              
            if (!existingContract) {
              // Verify contract data for required fields
              if (contractDetails && contractDetails.signature) {
                const { error: contractError } = await supabaseClient
                  .from('contract_signatures')
                  .insert({
                    user_id: userId,
                    plan_id: planId,
                    full_name: contractDetails.fullName || '',
                    email: paymentSession.email || '',
                    signature: contractDetails.signature,
                    contract_html: contractDetails.contractHtml,
                    contract_version: contractDetails.contractVersion || '1.0',
                    agreed_to_terms: contractDetails.agreedToTerms || false,
                    agreed_to_privacy: contractDetails.agreedToPrivacy || false,
                    browser_info: contractDetails.browserInfo || {},
                    created_at: now.toISOString()
                  });
                  
                if (contractError) {
                  console.error('Error saving contract signature:', contractError);
                } else {
                  console.log('Contract signature saved successfully');
                }
              } else {
                console.log('Contract data missing required fields (signature)');
              }
            } else {
              console.log('Contract already exists, skipping save');
            }
          }
        }
      } else {
        // Failed payment
        console.log('Recording failed payment');
        
        // Record the failed payment
        const paymentLogData = {
          user_id: userId || null,
          token: webhookData.LowProfileId,
          status: 'failed',
          amount: paymentSession.payment_details?.amount || 0,
          transaction_details: webhookData
        };

        if (existingPayment) {
          await supabaseClient
            .from('user_payment_logs')
            .update(paymentLogData)
            .eq('id', existingPayment.id);
        } else {
          await supabaseClient
            .from('user_payment_logs')
            .insert(paymentLogData);
        }
        
        // Record payment error
        await supabaseClient.from('payment_errors').insert({
          user_id: userId || paymentSession.email || '',
          error_code: (webhookData.ResponseCode || webhookData.OperationResponse || '0').toString(),
          error_message: webhookData.Description || 'Unknown error',
          payment_details: {
            webhookData,
            paymentSession: paymentSession.id
          },
          context: 'webhook'
        });
      }
      
      // Mark the session as expired
      await supabaseClient
        .from('payment_sessions')
        .update({
          payment_details: {
            ...paymentSession.payment_details,
            status: isSuccessful ? 'completed' : 'failed',
            webhookProcessed: true,
            webhookData,
            processedAt: new Date().toISOString()
          },
          expires_at: new Date().toISOString()
        })
        .eq('id', paymentSession.id);
        
      console.log(`Payment session ${paymentSession.id} marked as ${isSuccessful ? 'completed' : 'failed'}`);
    } else {
      // No associated payment session found
      console.log('No payment session found for lowProfileId:', webhookData.LowProfileId);
      
      // Still record the webhook data
      await supabaseClient.from('user_payment_logs').insert({
        token: webhookData.LowProfileId,
        status: isSuccessful ? 'completed' : 'failed',
        amount: webhookData.TranzactionInfo?.Amount || 0,
        transaction_details: webhookData
      });
      
      console.log('Payment logged without session');
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Always return 200 to Cardcom to acknowledge receipt
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Always return 200 even on error to acknowledge receipt
      }
    );
  }
});
