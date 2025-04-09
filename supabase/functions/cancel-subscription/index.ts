
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
    // Parse request body
    const requestBody = await req.json().catch(() => ({}));
    const { cancellationReason, feedback } = requestBody;
    
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

    console.log('Cancelling subscription for user:', user.id);
    
    // Get the current subscription
    const { data: subscription, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('*, payment_tokens(token, card_last_four, card_brand)')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching subscription:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch subscription details',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    if (!subscription) {
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
    
    // Check if subscription is already cancelled
    if (subscription.cancelled_at) {
      console.log('Subscription already cancelled at:', subscription.cancelled_at);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Subscription already cancelled',
          cancellationDate: subscription.cancelled_at,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        }
      );
    }

    // If subscription has a payment token that needs to be canceled with CardCom
    let cardComStatus = null;
    if (subscription.payment_token_id) {
      // In a real implementation, you would call CardCom API to cancel recurring payments
      console.log('Would cancel token in CardCom:', subscription.payment_token_id);
      
      // For production, this is where you'd make the API call to CardCom to cancel the recurring payments
      // This depends on the CardCom API specifics for cancellation
      
      // Mark the payment token as inactive
      const { error: tokenError } = await supabaseClient
        .from('payment_tokens')
        .update({ is_active: false })
        .eq('id', subscription.payment_token_id);
        
      if (tokenError) {
        console.warn('Error updating payment token:', tokenError);
        // Continue with cancellation even if token update fails
      } else {
        cardComStatus = 'deactivated';
      }
    }
    
    // Get user profile information for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();
      
    // Mark subscription as cancelled in the database
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        // Store cancellation reason if provided
        metadata: subscription.metadata ? {
          ...subscription.metadata,
          cancellation_reason: cancellationReason || 'not_provided',
          cancellation_feedback: feedback || '',
        } : {
          cancellation_reason: cancellationReason || 'not_provided',
          cancellation_feedback: feedback || '',
        }
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
    const { error: historyError } = await supabaseClient
      .from('payment_history')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        amount: 0,
        status: 'subscription_cancelled',
        payment_date: now,
        metadata: {
          cancellation_reason: cancellationReason || 'not_provided',
          plan_type: subscription.plan_type,
          card_com_status: cardComStatus
        }
      });
      
    if (historyError) {
      console.warn('Error adding cancellation to payment history:', historyError);
      // Continue even if history recording fails
    }
    
    // Send cancellation confirmation email
    try {
      const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
      
      // Call the email sender edge function
      await supabaseClient.functions.invoke('smtp-sender', {
        body: {
          to: user.email,
          subject: 'אישור ביטול מנוי - AlgoTouch',
          html: `
          <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
            <h2>אישור ביטול מנוי</h2>
            <p>שלום ${fullName || 'יקר'},</p>
            <p>אנו מאשרים בזאת כי מנוי ה-${subscription.plan_type === 'monthly' ? 'חודשי' : 'שנתי'} שלך בוטל בהצלחה.</p>
            <p>תוכל להמשיך להשתמש בשירות עד לתאריך ${new Date(subscription.current_period_ends_at || now).toLocaleDateString('he-IL')}.</p>
            <p>אנו מקווים לראותך שוב בעתיד!</p>
            <p>לכל שאלה, אנא צור קשר עם שירות הלקוחות שלנו.</p>
            <p>בברכה,<br>צוות AlgoTouch</p>
          </div>
          `
        }
      });
      
      console.log('Cancellation confirmation email sent');
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Continue even if email sending fails
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription cancelled successfully',
        endDate: subscription.current_period_ends_at,
        planType: subscription.plan_type
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
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
