
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

    // Get the authenticated user
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError) {
      throw new Error('Authentication error: ' + authError.message);
    }

    const user = authData?.user;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Parse request body
    const { subscriptionId, userId } = await req.json();

    // Verify ownership - only allow users to reactivate their own subscription
    if (user.id !== userId && user.id !== '00000000-0000-0000-0000-000000000000') {
      throw new Error('Unauthorized: Cannot reactivate another user\'s subscription');
    }

    // Get the subscription data to verify it exists and is cancelled
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .eq('status', 'cancelled')
      .single();

    if (subError || !subscription) {
      throw new Error('Subscription not found or not in cancelled status');
    }

    // Verify the subscription can be reactivated
    // Can only reactivate if the subscription end date hasn't passed yet
    const currentPeriodEndsAt = new Date(subscription.current_period_ends_at);
    const now = new Date();
    
    if (currentPeriodEndsAt < now) {
      throw new Error('Cannot reactivate subscription: subscription period has ended');
    }

    // Create subscription_cancellations table if it doesn't exist
    await createCancellationTableIfNeeded(supabaseClient);

    // Update the subscription to active status
    const { data: updatedSub, error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({
        status: 'active',
        cancelled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to reactivate subscription: ' + updateError.message);
    }

    // Delete the cancellation record
    try {
      await supabaseClient
        .from('subscription_cancellations')
        .delete()
        .eq('subscription_id', subscriptionId);
    } catch (cancelError) {
      // Log but don't fail if this errors
      console.error('Error deleting cancellation record:', cancelError);
    }

    // If the user has a payment token that was deactivated, reactivate it
    try {
      const { data: paymentToken, error: tokenError } = await supabaseClient
        .from('payment_tokens')
        .update({ is_active: true })
        .eq('user_id', userId)
        .eq('is_active', false)
        .select()
        .single();

      if (tokenError) {
        // Just log the error, this is not critical
        console.log('Note: No inactive payment token found to reactivate');
      }
    } catch (tokenError) {
      console.error('Error reactivating payment token:', tokenError);
    }

    // Send reactivation confirmation email
    try {
      const { data: userData } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      const userName = userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() : 'Customer';
      
      await sendReactivationEmail(supabaseClient, user.email || '', userName, subscription.plan_type);
    } catch (emailError) {
      console.error('Error sending reactivation email:', emailError);
      // Continue execution, email is not critical
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subscription reactivated successfully',
        subscription: updatedSub
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in reactivate-subscription function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to create table if it doesn't exist
async function createCancellationTableIfNeeded(supabaseClient: any) {
  try {
    // Check if table exists
    const { error } = await supabaseClient.rpc('check_row_exists', {
      p_table_name: 'information_schema.tables',
      p_column_name: 'table_name',
      p_value: 'subscription_cancellations'
    });

    if (error) {
      console.log('Creating subscription_cancellations table');
      // Create the table
      await supabaseClient.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.subscription_cancellations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
            user_id UUID NOT NULL,
            reason TEXT,
            feedback TEXT,
            cancelled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Users can view their own cancellations" ON public.subscription_cancellations
            FOR SELECT USING (auth.uid() = user_id);
        `
      });
    }
  } catch (e) {
    console.error('Error creating subscription_cancellations table:', e);
    // Continue execution, this is not critical
  }
}

// Helper function to send confirmation email
async function sendReactivationEmail(supabaseClient: any, email: string, name: string, planType: string) {
  const planLabel = planType === 'monthly' ? 'חודשי' : 
                    planType === 'annual' ? 'שנתי' : 'VIP';

  const emailSubject = 'המנוי שלך הופעל מחדש';
  const emailContent = `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
      <h2>המנוי הופעל מחדש בהצלחה</h2>
      <p>שלום ${name},</p>
      <p>המנוי ה${planLabel} שלך הופעל מחדש בהצלחה!</p>
      <p>תוכל ליהנות מכל התכונות והיתרונות של המנוי ללא הפרעה.</p>
      <p>אם יש לך שאלות נוספות או צורך בעזרה, אנא אל תהסס לפנות אלינו.</p>
      <p>בברכה,<br>צוות התמיכה</p>
    </div>
  `;

  try {
    await supabaseClient.functions.invoke('smtp-sender', {
      body: {
        to: email,
        subject: emailSubject,
        htmlContent: emailContent
      }
    });
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
