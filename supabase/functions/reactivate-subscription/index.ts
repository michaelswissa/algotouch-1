
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Get the user information
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Parse the request body
    const { subscriptionId, userId } = await req.json();
    
    if (!subscriptionId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Verify that the requesting user owns the subscription
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You can only reactivate your own subscription' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }
    
    // Get the subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*, payment_tokens(*)')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single();
      
    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }
    
    // Check if the subscription can be reactivated
    // Only cancelled subscriptions that haven't expired yet can be reactivated
    const now = new Date();
    const periodEndsAt = subscription.current_period_ends_at ? 
      new Date(subscription.current_period_ends_at) : null;
    
    if (!periodEndsAt || now > periodEndsAt) {
      return new Response(
        JSON.stringify({ 
          error: 'Subscription has already expired and cannot be reactivated' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Check if the subscription was cancelled
    if (subscription.status !== 'cancelled') {
      return new Response(
        JSON.stringify({ 
          error: 'Only cancelled subscriptions can be reactivated' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Determine the status to set
    const newStatus = subscription.trial_ends_at && 
      now < new Date(subscription.trial_ends_at) ? 'trial' : 'active';
    
    // Reactivate the subscription
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({
        status: newStatus,
        cancelled_at: null
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reactivate subscription' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    // If there's a payment token, reactivate it
    if (subscription.payment_token_id) {
      await supabaseClient
        .from('payment_tokens')
        .update({ is_active: true })
        .eq('id', subscription.payment_token_id);
    }
    
    // Delete the cancellation record
    await supabaseClient
      .from('subscription_cancellations')
      .delete()
      .eq('subscription_id', subscriptionId);
    
    // Send reactivation confirmation email
    try {
      // Get user details
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      
      const fullName = profile ? 
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 
        'שלום';
      
      const emailSubject = 'המנוי שלך הופעל מחדש';
      const emailContent = `
        <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
          <h2>המנוי שלך הופעל מחדש</h2>
          <p>שלום ${fullName},</p>
          <p>המנוי שלך הופעל מחדש בהצלחה.</p>
          <p>אנו שמחים שבחרת להמשיך להשתמש בשירות שלנו!</p>
          <p>בברכה,<br>צוות התמיכה</p>
        </div>
      `;
      
      // Send the email
      await supabaseClient.functions.invoke('smtp-sender', {
        body: {
          to: user.email,
          subject: emailSubject,
          html: emailContent
        }
      });
    } catch (emailError) {
      console.error('Error sending reactivation email:', emailError);
      // Continue even if email sending fails
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during subscription reactivation' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
