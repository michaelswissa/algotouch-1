
import { toast } from 'sonner';
import { callIzidocSignFunction, ContractData } from './izidoc-service';
import { saveContractToDatabase, updateSubscriptionStatus } from './storage-service';
import { sendContractConfirmationEmail } from './email-service';

/**
 * Processes a signed contract, saving it to the database and sending confirmation
 */
export async function processSignedContract(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: ContractData
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
    const saveResult = await saveContractToDatabase(userId, planId, fullName, email, contractData);
    
    if (!saveResult.success) {
      toast.error('שגיאה בשמירת החתימה');
      return false;
    }
    
    // Also try to send a confirmation email directly, in case the edge function fails
    try {
      await sendContractConfirmationEmail(email, fullName, new Date().toISOString());
      console.log('Contract confirmation email sent directly');
    } catch (emailError) {
      console.error('Error sending direct confirmation email:', emailError);
      // Don't return false here, as the contract was still saved successfully
    }
    
    // Try to update the subscription status as well
    await updateSubscriptionStatus(userId);
    
    return true;
  } catch (error) {
    console.error('Exception processing contract signature:', error);
    toast.error('שגיאה בעיבוד החתימה');
    return false;
  }
}

// Re-export component functions for backward compatibility
export * from './email-service';
export * from './izidoc-service';
export * from './storage-service';
