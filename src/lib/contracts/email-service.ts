
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
  contractSignedAt: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // In a real implementation, we would call an email service or Edge Function
    console.log('Sending contract confirmation email to:', {
      email,
      fullName,
      contractSignedAt
    });
    
    // For now, we'll just simulate success
    return { success: true };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error };
  }
}
