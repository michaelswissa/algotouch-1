
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachmentData?: {
    filename: string;
    content: string; // Base64 encoded content
    mimeType: string;
  }[];
}

/**
 * Sends an email using our SMTP integration
 */
export async function sendEmail(emailRequest: EmailRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!emailRequest.to || !emailRequest.subject || !emailRequest.html) {
      const missing = [];
      if (!emailRequest.to) missing.push("to");
      if (!emailRequest.subject) missing.push("subject");
      if (!emailRequest.html) missing.push("html");
      
      const errorMsg = `Missing required email fields: ${missing.join(", ")}`;
      console.error(errorMsg);
      toast.error('שגיאה בשליחת הודעת דואר אלקטרוני: חסרים שדות חובה');
      return { success: false, error: errorMsg };
    }
    
    console.log('Sending email via SMTP:', {
      to: emailRequest.to,
      subject: emailRequest.subject,
      hasAttachments: emailRequest.attachmentData && emailRequest.attachmentData.length > 0
    });
    
    const { data, error } = await supabase.functions.invoke('smtp-sender', {
      body: emailRequest,
    });

    if (error) {
      console.error('Error sending email:', error);
      toast.error('שגיאה בשליחת הודעת דואר אלקטרוני');
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log('Email sent successfully:', data);
    return { success: true, messageId: data?.messageId || 'sent' };
  } catch (error: any) {
    console.error('Exception sending email:', error);
    toast.error('שגיאה בשליחת הודעת דואר אלקטרוני');
    return { success: false, error: error.message || JSON.stringify(error) };
  }
}

/**
 * Sends a welcome email to a newly registered user
 */
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<{ success: boolean }> {
  console.log('Sending welcome email to:', userEmail);
  
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
  console.log('Sending verification email to:', userEmail);
  
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
  console.log('Sending password reset email to:', userEmail);
  
  return sendEmail({
    to: userEmail,
    subject: 'איפוס סיסמה ל-AlgoTouch',
    html: `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 30px; background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
        <h1 style="color: #4a90e2; margin: 10px 0;">AlgoTouch</h1>
        <p style="font-size: 18px; color: #666; margin: 0;">פלטפורמת המסחר החכמה</p>
      </div>
      
      <div style="background-color: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <h2 style="color: #333; border-bottom: 2px solid #4a90e2; padding-bottom: 10px; margin-bottom: 20px;">בקשה לאיפוס סיסמה</h2>
        
        <p style="font-size: 16px; line-height: 1.6;">שלום,</p>
        <p style="font-size: 16px; line-height: 1.6;">קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך ב-<strong>AlgoTouch</strong>.</p>
        <p style="font-size: 16px; line-height: 1.6;">כדי לאפס את הסיסמה ולהמשיך להשתמש בפלטפורמת המסחר החכמה שלנו, אנא לחץ/י על הכפתור הבא:</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${resetLink}" style="display: inline-block; background-color: #4a90e2; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; box-shadow: 0 3px 6px rgba(0,0,0,0.1);">איפוס סיסמה</a>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6;">אם הכפתור לא עובד, אנא העתק/י את הקישור הבא לדפדפן שלך:</p>
        <p style="background-color: #f5f5f5; padding: 12px; border-radius: 5px; word-break: break-all; margin: 15px 0; font-size: 14px;">${resetLink}</p>
        
        <div style="background-color: #fafafa; border-right: 4px solid #f0ad4e; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-size: 15px;"><strong>שים/י לב:</strong> קישור זה תקף למשך 24 שעות בלבד.</p>
          <p style="margin: 10px 0 0 0; font-size: 15px;">אם לא ביקשת לאפס את הסיסמה שלך, אנא התעלם/י מהודעה זו וצור/י קשר עם צוות התמיכה שלנו בהקדם.</p>
        </div>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 14px; color: #666;">
        <p style="margin-bottom: 10px;">בברכה,<br><strong>צוות AlgoTouch</strong></p>
        <p style="margin: 0;">מוקד תמיכה: <a href="mailto:support@algotouch.co.il" style="color: #4a90e2; text-decoration: none;">support@algotouch.co.il</a></p>
        <p style="margin-top: 15px; font-size: 12px; color: #999;">© 2024 AlgoTouch. כל הזכויות שמורות.</p>
      </div>
    </div>
    `,
  });
}
