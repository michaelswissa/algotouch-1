
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { email, errorInfo, sessionId, recoveryUrl } = await req.json();

    if (!email) {
      throw new Error('Missing required parameters');
    }

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
});
