
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the URL path to determine the action
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    // Based on the action, execute the appropriate functionality
    switch (action) {
      case 'save-session': 
        return await handleSaveSession(req, supabaseClient);
      case 'get-session':
        return await handleGetSession(req, supabaseClient);
      default:
        // Default action: send recovery email
        return await handleSendRecoveryEmail(req, supabaseClient);
    }
  } catch (error) {
    console.error('Error in payment recovery function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Handler for saving payment session data
async function handleSaveSession(req: Request, supabaseClient: any) {
  const {
    sessionId,
    userId,
    email,
    planId,
    paymentDetails,
    expiresAt
  } = await req.json();

  try {
    // Create a payment_sessions table if it doesn't exist
    await createPaymentSessionsTableIfNeeded(supabaseClient);

    // Insert the session data
    const { error } = await supabaseClient
      .from('payment_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        email: email,
        plan_id: planId,
        payment_details: paymentDetails,
        expires_at: expiresAt
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, sessionId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error saving payment session:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}

// Handler for retrieving session data
async function handleGetSession(req: Request, supabaseClient: any) {
  const { sessionId } = await req.json();

  try {
    // Create table if needed (in case this is called before save)
    await createPaymentSessionsTableIfNeeded(supabaseClient);

    // Get the session data
    const { data, error } = await supabaseClient
      .from('payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ success: false, error: 'Session not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
      throw error;
    }

    // Check if session has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session has expired' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 410, // Gone
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ...data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error retrieving payment session:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}

// Handler for sending recovery emails
async function handleSendRecoveryEmail(req: Request, supabaseClient: any) {
  const { email, errorInfo, sessionId, recoveryUrl } = await req.json();

  if (!email) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required parameters' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }

  try {
    // Create payment_recovery_logs table if it doesn't exist
    await createRecoveryLogsTableIfNeeded(supabaseClient);

    // Generate email content
    const emailSubject = 'השלמת תשלום במערכת';
    const emailContent = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
        <h2>השלמת תהליך התשלום</h2>
        <p>שלום,</p>
        <p>נראה שנתקלת בבעיה בתהליך התשלום באתר שלנו.</p>
        <p>אנו מתנצלים על אי הנוחות. כדי להשלים את התהליך, אנא לחץ על הקישור למטה:</p>
        <p>
          <a href="${recoveryUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">השלם תשלום</a>
        </p>
        <p>קישור זה יהיה זמין למשך 24 שעות.</p>
        <p>אם אתה נתקל בבעיות נוספות, אנא צור קשר עם התמיכה שלנו.</p>
        <p>בברכה,<br>צוות התמיכה</p>
      </div>
    `;

    // Send the email
    const { error: emailError } = await supabaseClient.functions.invoke('smtp-sender', {
      body: {
        to: email,
        subject: emailSubject,
        html: emailContent,
      }
    });

    if (emailError) {
      throw emailError;
    }

    // Log the recovery attempt
    await supabaseClient.from('payment_recovery_logs').insert({
      email,
      session_id: sessionId,
      error_info: errorInfo,
      recovery_url: recoveryUrl,
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in payment recovery function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}

// Utility function to create payment_sessions table if it doesn't exist
async function createPaymentSessionsTableIfNeeded(supabaseClient: any) {
  try {
    // Check if the table exists
    const { data, error } = await supabaseClient.rpc('check_row_exists', {
      p_table_name: 'information_schema.tables',
      p_column_name: 'table_name',
      p_value: 'payment_sessions'
    });

    // If the table doesn't exist, create it
    if (!data) {
      await supabaseClient.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS public.payment_sessions (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id),
            email TEXT,
            plan_id TEXT NOT NULL,
            payment_details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used BOOLEAN DEFAULT false
          );

          -- Add RLS policies
          ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

          -- Allow admins and the owner to read their own session data
          CREATE POLICY "Users can read their own payment sessions"
            ON public.payment_sessions
            FOR SELECT
            USING (
              auth.uid() = user_id OR
              auth.uid() = '00000000-0000-0000-0000-000000000000'
            );
        `
      });
    }
  } catch (error) {
    console.error('Error creating payment_sessions table:', error);
    // Continue execution, the table might already exist
  }
}

// Utility function to create payment_recovery_logs table if it doesn't exist
async function createRecoveryLogsTableIfNeeded(supabaseClient: any) {
  try {
    // Check if the table exists
    const { data, error } = await supabaseClient.rpc('check_row_exists', {
      p_table_name: 'information_schema.tables',
      p_column_name: 'table_name',
      p_value: 'payment_recovery_logs'
    });

    // If the table doesn't exist, create it
    if (!data) {
      await supabaseClient.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS public.payment_recovery_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT NOT NULL,
            session_id UUID,
            error_info JSONB,
            recovery_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            resolved_at TIMESTAMP WITH TIME ZONE
          );

          -- Add RLS policies
          ALTER TABLE public.payment_recovery_logs ENABLE ROW LEVEL SECURITY;

          -- Only admins can view logs
          CREATE POLICY "Only admins can view payment recovery logs"
            ON public.payment_recovery_logs
            FOR SELECT
            USING (
              auth.uid() = '00000000-0000-0000-0000-000000000000'
            );
        `
      });
    }
  } catch (error) {
    console.error('Error creating payment_recovery_logs table:', error);
    // Continue execution, the table might already exist
  }
}
