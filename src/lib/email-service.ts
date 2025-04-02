
import { supabase } from '@/integrations/supabase/client';

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends an email using our custom Gmail API integration
 */
export async function sendEmail(emailRequest: EmailRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('gmail-sender', {
      body: emailRequest,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Exception sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a welcome email to a newly registered user
 */
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<{ success: boolean }> {
  return sendEmail({
    to: userEmail,
    subject: 'ברוכים הבאים ל-AlgoTouch',
    html: `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
      <h1>שלום ${userName},</h1>
      <p>ברוכים הבאים ל-AlgoTouch!</p>
      <p>אנו שמחים שהצטרפת אלינו ומקווים שתמצא את השירות שלנו מועיל ומהנה.</p>
      <p>אם יש לך שאלות כלשהן, אל תהסס לפנות אלינו בכתובת <a href="mailto:support@algotouch.co.il">support@algotouch.co.il</a>.</p>
      <p>בברכה,<br>צוות AlgoTouch</p>
    </div>
    `,
  });
}

/**
 * Sends a verification email for account confirmation
 */
export async function sendVerificationEmail(userEmail: string, verificationLink: string): Promise<{ success: boolean }> {
  return sendEmail({
    to: userEmail,
    subject: 'אימות חשבון AlgoTouch',
    html: `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
      <h1>אימות חשבון</h1>
      <p>תודה שנרשמת ל-AlgoTouch. כדי להשלים את תהליך ההרשמה, אנא לחץ על הקישור הבא:</p>
      <p><a href="${verificationLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">אמת את החשבון שלי</a></p>
      <p>אם אתה מתקשה ללחוץ על הכפתור, אנא העתק את הקישור הבא לדפדפן שלך:</p>
      <p>${verificationLink}</p>
      <p>אם לא ביקשת לפתוח חשבון ב-AlgoTouch, אנא התעלם מהודעה זו.</p>
      <p>בברכה,<br>צוות AlgoTouch</p>
    </div>
    `,
  });
}

/**
 * Sends a password reset email
 */
export async function sendPasswordResetEmail(userEmail: string, resetLink: string): Promise<{ success: boolean }> {
  return sendEmail({
    to: userEmail,
    subject: 'איפוס סיסמה ל-AlgoTouch',
    html: `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
      <h1>איפוס סיסמה</h1>
      <p>קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך ב-AlgoTouch. כדי לאפס את הסיסמה, אנא לחץ על הקישור הבא:</p>
      <p><a href="${resetLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">אפס סיסמה</a></p>
      <p>אם אתה מתקשה ללחוץ על הכפתור, אנא העתק את הקישור הבא לדפדפן שלך:</p>
      <p>${resetLink}</p>
      <p>אם לא ביקשת לאפס את הסיסמה שלך, אנא התעלם מהודעה זו.</p>
      <p>בברכה,<br>צוות AlgoTouch</p>
    </div>
    `,
  });
}
