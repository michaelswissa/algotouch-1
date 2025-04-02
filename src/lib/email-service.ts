
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
    subject: 'ברוכים הבאים ל-AlgoTouch - פלטפורמת המסחר החכמה',
    html: `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #4a90e2;">AlgoTouch</h1>
        <p style="font-size: 18px; color: #666;">פלטפורמת המסחר החכמה</p>
      </div>
      <h2>שלום ${userName},</h2>
      <p>ברוכים הבאים ל-AlgoTouch!</p>
      <p>תודה שבחרת להצטרף לקהילת המשקיעים החכמים שלנו. אנו מתרגשים להיות חלק מהמסע שלך בעולם ההשקעות.</p>
      <p>עם AlgoTouch, תוכל/י:</p>
      <ul style="list-style-type: none; padding-left: 0;">
        <li style="margin: 10px 0; padding-left: 20px; position: relative;">✓ <span style="position: relative; left: 10px;">לעקוב אחר הביצועים של תיק ההשקעות שלך בזמן אמת</span></li>
        <li style="margin: 10px 0; padding-left: 20px; position: relative;">✓ <span style="position: relative; left: 10px;">לקבל תובנות מבוססות AI על הרגלי המסחר שלך</span></li>
        <li style="margin: 10px 0; padding-left: 20px; position: relative;">✓ <span style="position: relative; left: 10px;">לנהל יומן מסחר דיגיטלי חכם</span></li>
        <li style="margin: 10px 0; padding-left: 20px; position: relative;">✓ <span style="position: relative; left: 10px;">להשתתף בקורסים והדרכות בלעדיות</span></li>
      </ul>
      <p>למידע נוסף או לכל שאלה, אנחנו כאן לעזור: <a href="mailto:support@algotouch.co.il" style="color: #4a90e2; text-decoration: none;">support@algotouch.co.il</a></p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 14px; color: #666;">
        <p>בברכה,<br>צוות AlgoTouch</p>
      </div>
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
    subject: 'אימות חשבון AlgoTouch - צעד אחד לפני שמתחילים',
    html: `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #4a90e2;">AlgoTouch</h1>
        <p style="font-size: 18px; color: #666;">פלטפורמת המסחר החכמה</p>
      </div>
      <h2>אימות חשבון</h2>
      <p>תודה שנרשמת ל-AlgoTouch. אנו מתרגשים לקבל אותך לקהילת המשקיעים החכמים שלנו!</p>
      <p>כדי להשלים את תהליך ההרשמה ולהתחיל להשתמש בכל הכלים החכמים שלנו, אנא לחץ/י על הכפתור הבא:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" style="display: inline-block; background-color: #4a90e2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">אמת את החשבון שלי</a>
      </div>
      <p>אם הכפתור לא עובד, אנא העתק/י את הקישור הבא לדפדפן שלך:</p>
      <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-all;">${verificationLink}</p>
      <p>קישור זה תקף למשך 24 שעות. אם לא ביקשת לפתוח חשבון ב-AlgoTouch, אנא התעלם מהודעה זו.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 14px; color: #666;">
        <p>בברכה,<br>צוות AlgoTouch</p>
        <p>למידע נוסף: <a href="mailto:support@algotouch.co.il" style="color: #4a90e2; text-decoration: none;">support@algotouch.co.il</a></p>
      </div>
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
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #4a90e2;">AlgoTouch</h1>
        <p style="font-size: 18px; color: #666;">פלטפורמת המסחר החכמה</p>
      </div>
      <h2>איפוס סיסמה</h2>
      <p>קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך ב-AlgoTouch.</p>
      <p>כדי לאפס את הסיסמה ולהמשיך להשתמש בכל הכלים החכמים שלנו, אנא לחץ/י על הכפתור הבא:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; background-color: #4a90e2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">אפס סיסמה</a>
      </div>
      <p>אם הכפתור לא עובד, אנא העתק/י את הקישור הבא לדפדפן שלך:</p>
      <p style="background-color: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-all;">${resetLink}</p>
      <p>קישור זה תקף למשך 24 שעות. אם לא ביקשת לאפס את הסיסמה שלך, אנא התעלם מהודעה זו וצור קשר עם צוות התמיכה שלנו.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 14px; color: #666;">
        <p>בברכה,<br>צוות AlgoTouch</p>
        <p>למידע נוסף: <a href="mailto:support@algotouch.co.il" style="color: #4a90e2; text-decoration: none;">support@algotouch.co.il</a></p>
      </div>
    </div>
    `,
  });
}
