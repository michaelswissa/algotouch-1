
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Sends a confirmation email after contract is signed
 */
export async function sendContractConfirmationEmail(
  email: string,
  fullName: string,
  contractSignedAt: string,
  contractHtml?: string,
  contractId?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Sending contract confirmation email to:', {
      email,
      fullName,
      contractSignedAt,
      hasContractHtml: !!contractHtml,
      contractId
    });
    
    // Create email content with download link if contractId is available
    const subject = `אישור חתימה על הסכם - AlgoTouch`;
    
    // Format the date in Hebrew
    const dateObj = new Date(contractSignedAt);
    const formattedDate = new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(dateObj);
    
    // Email body HTML with the contract content embedded directly
    const htmlBody = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4a90e2;">AlgoTouch</h1>
        </div>
        <p>שלום ${fullName},</p>
        <p>אנו מאשרים כי ביום ${formattedDate} השלמת את תהליך החתימה הדיגיטלית על ההסכם עם AlgoTouch.</p>
        <p>החתימה בוצעה באופן אלקטרוני, תוך אישור מלא של כל התנאים והסעיפים המפורטים בהסכם, ונרשמה במערכת המאובטחת שלנו.</p>
        <p>מצורף עותק של ההסכם שנחתם. אנא שמור אותו למעקב.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
          <p>תודה על שיתוף הפעולה,<br>AlgoTouch</p>
        </div>
      </div>
    `;
    
    try {
      // Convert HTML to Base64 for attachment
      const encoder = new TextEncoder();
      const contractBytes = encoder.encode(contractHtml || '');
      const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));
      
      const filename = `contract-algotouch-${fullName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.html`;
      
      // Call the smtp-sender edge function to send email with attachment
      const { data, error } = await supabase.functions.invoke('smtp-sender', {
        body: {
          to: email,
          subject: subject,
          html: htmlBody,
          attachmentData: [{
            filename: filename,
            content: contractBase64,
            mimeType: "text/html"
          }]
        }
      });
      
      if (error) {
        console.error('Error calling smtp-sender function:', error);
        throw error;
      }
      
      console.log('Contract email sent successfully:', data);
      return { success: true };
    } catch (emailError) {
      console.error('Error sending contract via email:', emailError);
      
      // Try Gmail sender as fallback
      try {
        const { data, error } = await supabase.functions.invoke('gmail-sender', {
          body: {
            to: email,
            subject: subject,
            html: htmlBody
          }
        });
        
        if (error) {
          console.error('Fallback email also failed:', error);
          throw error;
        }
        
        console.log('Contract email sent via fallback method:', data);
        return { success: true };
      } catch (fallbackError) {
        console.error('All email attempts failed:', fallbackError);
        return { success: false, error: fallbackError };
      }
    }
  } catch (error) {
    console.error('Error in contract confirmation email:', error);
    return { success: false, error };
  }
}

/**
 * Send contract to support email as backup
 */
export async function sendContractToSupport(
  userId: string,
  fullName: string,
  email: string,
  contractHtml: string,
  contractId: string
): Promise<{ success: boolean; error?: any }> {
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
        to: "support@algotouch.co.il",
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
      return { success: false, error };
    }
    
    console.log('Contract backup email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Exception sending contract backup email:', error);
    return { success: false, error };
  }
}

/**
 * Function to save contract to local storage as backup
 */
export function saveContractToLocalStorage(contractId: string, contractHtml: string) {
  try {
    localStorage.setItem(`contract_${contractId}`, contractHtml);
    localStorage.setItem(`contract_${contractId}_timestamp`, new Date().toISOString());
    console.log(`Contract ${contractId} saved to local storage as backup`);
    return true;
  } catch (error) {
    console.error('Error saving contract to local storage:', error);
    return false;
  }
}

/**
 * Function to retrieve contract from local storage
 */
export function getContractFromLocalStorage(contractId: string): { html?: string, timestamp?: string } {
  try {
    const contractHtml = localStorage.getItem(`contract_${contractId}`);
    const timestamp = localStorage.getItem(`contract_${contractId}_timestamp`);
    
    if (!contractHtml) {
      console.log(`No contract ${contractId} found in local storage`);
      return {};
    }
    
    console.log(`Retrieved contract ${contractId} from local storage, saved at ${timestamp}`);
    return { html: contractHtml, timestamp };
  } catch (error) {
    console.error('Error retrieving contract from local storage:', error);
    return {};
  }
}
