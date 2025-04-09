
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user information
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Get cancellation details from request
    const { reason, feedback, subscriptionId } = await req.json();
    
    console.log('Cancelling subscription for user:', user.id, {
      reason,
      subscriptionId
    });
    
    // Get the current subscription
    const { data: subscription, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !subscription) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active subscription found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }
    
    // Check if subscription has a payment token that needs to be canceled with CardCom
    if (subscription.payment_token_id) {
      // In a real implementation, you would call CardCom API to cancel recurring payments
      console.log('Would cancel token in CardCom:', subscription.payment_token_id);
      
      // For production, this is where you'd make the API call to CardCom to cancel the recurring payments
      // This depends on the CardCom API specifics for cancellation
    }
    
    // Mark subscription as cancelled in the database
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now,
      })
      .eq('id', subscription.id);
      
    if (updateError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to update subscription: ${updateError.message}`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    // Add record to payment history
    await supabaseClient
      .from('payment_history')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        amount: 0,
        status: 'subscription_cancelled',
        payment_date: now
      });
    
    // Store cancellation feedback if provided
    if (reason || feedback) {
      try {
        await supabaseClient
          .from('subscription_cancellations')
          .insert({
            user_id: user.id,
            subscription_id: subscription.id,
            reason,
            feedback,
            cancelled_at: now
          });
      } catch (feedbackError) {
        console.error('Error storing cancellation feedback:', feedbackError);
        // Non-critical error, continue with cancellation
      }
    }
    
    // Send cancellation notification email (could be implemented with another edge function)
    // try {
    //   await supabaseClient.functions.invoke('send-email', {
    //     body: {
    //       to: user.email,
    //       subject: 'Subscription Cancellation Confirmation',
    //       template: 'subscription_cancelled',
    //       data: {
    //         fullName: user.user_metadata?.full_name || user.email,
    //         subscriptionDetails: {
    //           planType: subscription.plan_type,
    //           endDate: subscription.current_period_ends_at || now
    //         }
    //       }
    //     }
    //   });
    // } catch (emailError) {
    //   console.error('Error sending cancellation email:', emailError);
    //   // Non-critical error, continue with cancellation
    // }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription cancelled successfully',
        effectiveDate: subscription.current_period_ends_at
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to cancel subscription'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
