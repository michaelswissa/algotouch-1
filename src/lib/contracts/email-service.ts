
import { sendEmail } from '@/lib/email-service';
import { supabase } from '@/integrations/supabase/client';

/**
 * Sends a contract confirmation email to the user
 */
export async function sendContractConfirmationEmail(
  userEmail: string, 
  userName: string, 
  signedAt: string
): Promise<{ success: boolean }> {
  // Format the date and time
  const dateObj = new Date(signedAt);
  const formattedDate = dateObj.toLocaleDateString('he-IL');
  const formattedTime = dateObj.toLocaleTimeString('he-IL');

  console.log('Sending contract confirmation email to:', userEmail);
  
  try {
    // First try using Gmail sender function
    const { data: gmailData, error: gmailError } = await supabase.functions.invoke('gmail-sender', {
      body: {
        to: userEmail,
        subject: 'אישור חתימה על הסכם - AlgoTouch',
        html: `
        <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4a90e2;">AlgoTouch</h1>
          </div>
          <p>שלום ${userName},</p>
          <p>אנו מאשרים כי ביום ${formattedDate} בשעה ${formattedTime} השלמת את תהליך החתימה הדיגיטלית על ההסכם עם AlgoTouch.</p>
          <p>החתימה בוצעה באופן אלקטרוני, תוך אישור מלא של כל התנאים והסעיפים המפורטים בהסכם, ונרשמה במערכת המאובטחת שלנו.</p>
          <p>לצורך עיון במסמך המלא, ניתן לבקש עותק מצוות התמיכה.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
            <p>תודה על שיתוף הפעולה,<br/>AlgoTouch</p>
          </div>
        </div>
        `,
      },
    });

    // If Gmail sender fails, fallback to email-service (SMTP)
    if (gmailError) {
      console.warn('Gmail sender failed, falling back to SMTP:', gmailError);
      return sendEmail({
        to: userEmail,
        subject: 'אישור חתימה על הסכם - AlgoTouch',
        html: `
        <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4a90e2;">AlgoTouch</h1>
          </div>
          <p>שלום ${userName},</p>
          <p>אנו מאשרים כי ביום ${formattedDate} בשעה ${formattedTime} השלמת את תהליך החתימה הדיגיטלית על ההסכם עם AlgoTouch.</p>
          <p>החתימה בוצעה באופן אלקטרוני, תוך אישור מלא של כל התנאים והסעיפים המפורטים בהסכם, ונרשמה במערכת המאובטחת שלנו.</p>
          <p>לצורך עיון במסמך המלא, ניתן לבקש עותק מצוות התמיכה.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
            <p>תודה על שיתוף הפעולה,<br/>AlgoTouch</p>
          </div>
        </div>
        `,
      });
    }

    console.log('Contract confirmation email sent successfully via Gmail:', gmailData);
    return { success: true };
  } catch (error) {
    console.error('Error sending contract confirmation email:', error);
    return { success: false };
  }
}
