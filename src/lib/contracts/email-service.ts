
import { supabase } from '@/integrations/supabase/client';

/**
 * Sends contract by email as a backup measure
 */
export async function sendContractByEmail(
  userId: string,
  fullName: string,
  email: string,
  contractHtml: string,
  contractId: string
): Promise<boolean> {
  try {
    console.log(`Sending contract backup email for user: ${userId}, contract: ${contractId}`);
    
    // Prepare email content
    const subject = `[BACKUP] Contract signed - ${fullName}`;
    const htmlContent = `
      <h1>Contract Backup</h1>
      <p>This is an automatic backup of a signed contract.</p>
      <p><strong>User ID:</strong> ${userId}</p>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Contract ID:</strong> ${contractId}</p>
      <p><strong>Signed at:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p>The full contract HTML is attached to this email.</p>
    `;
    
    // Convert HTML to Base64 for attachment
    const encoder = new TextEncoder();
    const contractBytes = encoder.encode(contractHtml);
    const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));
    
    // Send email using edge function
    const { data, error } = await supabase.functions.invoke('smtp-sender', {
      body: {
        to: ["support@algotouch.co.il", email], // Send to both support and user
        subject: subject,
        html: htmlContent,
        attachmentData: [{
          filename: `contract-${fullName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.html`,
          content: contractBase64,
          mimeType: "text/html"
        }]
      }
    });
    
    if (error || !data?.success) {
      console.error('Error sending contract backup email:', error || data);
      return false;
    }
    
    console.log('Contract backup email sent successfully');
    return true;
  } catch (error) {
    console.error('Exception sending contract backup email:', error);
    return false;
  }
}

/**
 * Sends a confirmation email after contract is signed
 */
export async function sendContractConfirmationEmail(
  email: string,
  fullName: string,
  contractSignedAt: string,
  contractId: string,
  contractHtml: string
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Sending contract confirmation email to:', email);
    
    // Format the date in a user-friendly way
    const formattedDate = new Date(contractSignedAt).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create a sharable contract URL
    const contractUrl = `${window.location.origin}/contract/${contractId}`;
    
    // Convert HTML to Base64 for attachment
    const encoder = new TextEncoder();
    const contractBytes = encoder.encode(contractHtml);
    const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));
    
    const htmlContent = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4a90e2;">AlgoTouch</h1>
        </div>
        <p>שלום ${fullName},</p>
        <p>אנו מאשרים כי ביום ${formattedDate} השלמת את תהליך החתימה הדיגיטלית על ההסכם עם AlgoTouch.</p>
        <p>החתימה בוצעה באופן אלקטרוני, תוך אישור מלא של כל התנאים והסעיפים המפורטים בהסכם, ונרשמה במערכת המאובטחת שלנו.</p>
        <p>לצפייה בהסכם החתום, אנא לחץ על הקישור הבא:</p>
        <p style="text-align: center;"><a href="${contractUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #4a90e2; color: white; text-decoration: none; border-radius: 5px;">צפה בהסכם החתום</a></p>
        <p>לנוחיותך, מצורף לאימייל זה עותק של ההסכם החתום.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
          <p>תודה על שיתוף הפעולה,<br>AlgoTouch</p>
        </div>
      </div>
    `;
    
    const { data, error } = await supabase.functions.invoke('smtp-sender', {
      body: {
        to: email,
        subject: `אישור חתימה על הסכם - AlgoTouch`,
        html: htmlContent,
        attachmentData: [{
          filename: `contract-${fullName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.html`,
          content: contractBase64,
          mimeType: "text/html"
        }]
      }
    });
    
    if (error) {
      console.error('Error sending confirmation email:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error };
  }
}
