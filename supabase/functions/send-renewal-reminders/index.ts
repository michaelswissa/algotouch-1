
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to send email
async function sendEmail(recipientEmail, subject, body) {
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpPort = Deno.env.get('SMTP_PORT');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPass = Deno.env.get('SMTP_PASS');
  
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.error("Missing SMTP configuration");
    return false;
  }
  
  try {
    // Import nodemailer dynamically
    const nodemailer = await import("npm:nodemailer@6.9.3");
    
    // Create transporter
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    
    // Send email
    await transporter.sendMail({
      from: `"Lovable" <${smtpUser}>`,
      to: recipientEmail,
      subject: subject,
      html: body,
    });
    
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Validate request
    const { action, secret } = await req.json();
    
    if (secret !== "reminder_processor_secret") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    
    if (action !== "send_reminders") {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Calculate dates
    const now = new Date();
    
    // For trial endings - send reminder 3 days before
    const trialEndingSoonDate = new Date(now);
    trialEndingSoonDate.setDate(trialEndingSoonDate.getDate() + 3);
    const trialEndingSoon = trialEndingSoonDate.toISOString().split('T')[0];
    
    // For annual renewals - send reminder 14 days before
    const annualRenewalSoonDate = new Date(now);
    annualRenewalSoonDate.setDate(annualRenewalSoonDate.getDate() + 14);
    const annualRenewalSoon = annualRenewalSoonDate.toISOString().split('T')[0];
    
    // Get subscriptions ending soon
    const { data: trialSubscriptions, error: trialError } = await supabase
      .from('subscriptions')
      .select(`
        id, user_id, plan_type, trial_ends_at,
        profiles(first_name, last_name)
      `)
      .eq('status', 'trial')
      .like('trial_ends_at', `${trialEndingSoon}%`);
      
    if (trialError) {
      console.error("Error fetching trial subscriptions:", trialError);
    }
    
    // Get annual subscriptions renewing soon
    const { data: annualSubscriptions, error: annualError } = await supabase
      .from('subscriptions')
      .select(`
        id, user_id, plan_type, current_period_ends_at, 
        profiles(first_name, last_name)
      `)
      .eq('plan_type', 'annual')
      .eq('status', 'active')
      .like('current_period_ends_at', `${annualRenewalSoon}%`);
      
    if (annualError) {
      console.error("Error fetching annual subscriptions:", annualError);
    }
    
    console.log(`Found ${trialSubscriptions?.length || 0} trial subscriptions ending soon`);
    console.log(`Found ${annualSubscriptions?.length || 0} annual subscriptions renewing soon`);
    
    const results = {
      trial_reminders_sent: 0,
      annual_reminders_sent: 0,
      errors: []
    };
    
    // Process trial subscriptions
    if (trialSubscriptions && trialSubscriptions.length > 0) {
      for (const subscription of trialSubscriptions) {
        try {
          // Get user information
          const { data: userData } = await supabase
            .auth.admin.getUserById(subscription.user_id);
          
          if (!userData?.user?.email) {
            console.error(`No email found for user ${subscription.user_id}`);
            results.errors.push({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              error: "No email found"
            });
            continue;
          }
          
          const userEmail = userData.user.email;
          const userName = subscription.profiles ? 
            `${subscription.profiles.first_name || ''} ${subscription.profiles.last_name || ''}`.trim() : 
            '';
          
          const trialEndDate = new Date(subscription.trial_ends_at).toLocaleDateString('he-IL');
          
          // Send reminder email
          const emailSent = await sendEmail(
            userEmail,
            "תזכורת: תקופת הניסיון שלך מסתיימת בקרוב - Lovable",
            `<div dir="rtl">
              <h2>שלום ${userName || 'לקוח יקר'},</h2>
              <p>תקופת הניסיון החינמית שלך במערכת Lovable מסתיימת בתאריך ${trialEndDate}.</p>
              <p>בתום תקופת הניסיון, כרטיס האשראי שלך יחוייב אוטומטית בסכום של $99 לחודש עבור המשך השימוש בשירות.</p>
              <p>אם אינך מעוניין להמשיך את המנוי, אנא בטל אותו בעמוד 'המנוי שלי' באתר עד לתאריך ${trialEndDate}.</p>
              <p>אם יש לך שאלות, אנחנו כאן לעזור!</p>
              <p>בברכה,<br>צוות Lovable</p>
            </div>`
          );
          
          if (emailSent) {
            results.trial_reminders_sent++;
          } else {
            results.errors.push({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              error: "Failed to send email"
            });
          }
        } catch (error) {
          console.error(`Error sending trial reminder for subscription ${subscription.id}:`, error);
          results.errors.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            error: error.message
          });
        }
      }
    }
    
    // Process annual subscriptions
    if (annualSubscriptions && annualSubscriptions.length > 0) {
      for (const subscription of annualSubscriptions) {
        try {
          // Get user information
          const { data: userData } = await supabase
            .auth.admin.getUserById(subscription.user_id);
          
          if (!userData?.user?.email) {
            console.error(`No email found for user ${subscription.user_id}`);
            results.errors.push({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              error: "No email found"
            });
            continue;
          }
          
          const userEmail = userData.user.email;
          const userName = subscription.profiles ? 
            `${subscription.profiles.first_name || ''} ${subscription.profiles.last_name || ''}`.trim() : 
            '';
          
          const renewalDate = new Date(subscription.current_period_ends_at).toLocaleDateString('he-IL');
          
          // Send reminder email
          const emailSent = await sendEmail(
            userEmail,
            "תזכורת: חידוש מנוי שנתי - Lovable",
            `<div dir="rtl">
              <h2>שלום ${userName || 'לקוח יקר'},</h2>
              <p>ברצוננו להזכיר לך כי המנוי השנתי שלך ל-Lovable יתחדש אוטומטית בתאריך ${renewalDate}, וכרטיס האשראי שלך יחוייב בסכום של $899.</p>
              <p>אנו מקווים שהשימוש במערכת מועיל לך! אם אינך מעוניין לחדש את המנוי, אנא בטל אותו בעמוד 'המנוי שלי' באתר עד לתאריך ${renewalDate}.</p>
              <p>במידה ויש לך שאלות לגבי חידוש המנוי, אנא צור עימנו קשר.</p>
              <p>בברכה,<br>צוות Lovable</p>
            </div>`
          );
          
          if (emailSent) {
            results.annual_reminders_sent++;
          } else {
            results.errors.push({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              error: "Failed to send email"
            });
          }
        } catch (error) {
          console.error(`Error sending annual renewal reminder for subscription ${subscription.id}:`, error);
          results.errors.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            error: error.message
          });
        }
      }
    }
    
    return new Response(
      JSON.stringify({
        message: `Sent ${results.trial_reminders_sent} trial reminders and ${results.annual_reminders_sent} annual renewal reminders`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Error sending renewal reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
