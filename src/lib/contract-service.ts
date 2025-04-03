
import { sendEmail } from '@/lib/email-service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

/**
 * Directly calls the izidoc-sign function to process a contract
 */
async function callIzidocSignFunction(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: any
): Promise<any> {
  try {
    console.log('Calling izidoc-sign function directly:', {
      userId, 
      planId, 
      email, 
      hasSignature: !!contractData.signature
    });
    
    const { data, error } = await supabase.functions.invoke('izidoc-sign', {
      body: {
        userId,
        planId,
        fullName,
        email,
        signature: contractData.signature,
        contractHtml: contractData.contractHtml,
        agreedToTerms: contractData.agreedToTerms,
        agreedToPrivacy: contractData.agreedToPrivacy,
        contractVersion: contractData.contractVersion || "1.0",
        browserInfo: contractData.browserInfo || {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      },
    });

    if (error) {
      console.error('Error from izidoc-sign function:', error);
      return { success: false, error };
    }

    console.log('Contract processed successfully by izidoc-sign:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Exception calling izidoc-sign function:', error);
    return { success: false, error };
  }
}

/**
 * Processes a signed contract, saving it to the database and sending confirmation
 */
export async function processSignedContract(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: any
): Promise<boolean> {
  try {
    console.log('Processing signed contract for user:', { userId, planId, email });
    
    // Improved validation of inputs
    if (!userId || !planId || !email || !contractData) {
      console.error('Missing required parameters for processSignedContract:', { 
        hasUserId: Boolean(userId), 
        hasPlanId: Boolean(planId), 
        hasEmail: Boolean(email),
        hasContractData: Boolean(contractData)
      });
      toast.error('חסרים פרטים הכרחיים לעיבוד החוזה');
      return false;
    }
    
    // Improved logging to debug contract data
    console.log('Contract data signature length:', contractData.signature?.length || 0);
    console.log('Contract data contains HTML:', Boolean(contractData.contractHtml));
    console.log('Contract user agreement:', {
      agreedToTerms: contractData.agreedToTerms,
      agreedToPrivacy: contractData.agreedToPrivacy
    });
    
    // Try the direct edge function approach first (preferred)
    const result = await callIzidocSignFunction(userId, planId, fullName, email, contractData);
    
    if (result.success) {
      // Function call was successful
      toast.success('ההסכם נחתם ונשמר בהצלחה!');
      return true;
    }
    
    console.warn('Direct function call failed, falling back to client-side processing', result.error);
    
    // Save the contract signature to Supabase directly as fallback
    const { data, error } = await supabase
      .from('contract_signatures')
      .insert({
        user_id: userId,
        plan_id: planId,
        full_name: fullName,
        email: email,
        signature: contractData.signature,
        contract_html: contractData.contractHtml,
        agreed_to_terms: contractData.agreedToTerms,
        agreed_to_privacy: contractData.agreedToPrivacy,
        contract_version: contractData.contractVersion || "1.0",
        browser_info: contractData.browserInfo || {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error saving contract signature directly:', error);
      toast.error('שגיאה בשמירת החתימה');
      return false;
    }

    console.log('Contract signature saved successfully:', data);
    
    // Also try to send a confirmation email directly, in case the edge function fails
    try {
      await sendContractConfirmationEmail(email, fullName, new Date().toISOString());
      console.log('Contract confirmation email sent directly');
    } catch (emailError) {
      console.error('Error sending direct confirmation email:', emailError);
      // Don't return false here, as the contract was still saved successfully
    }
    
    // Try to update the subscription status as well
    try {
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .update({
          contract_signed: true,
          contract_signed_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (subscriptionError) {
        console.error('Error updating subscription status:', subscriptionError);
      }
    } catch (subscriptionError) {
      console.error('Exception updating subscription:', subscriptionError);
    }
    
    return true;
  } catch (error) {
    console.error('Exception processing contract signature:', error);
    toast.error('שגיאה בעיבוד החתימה');
    return false;
  }
}
