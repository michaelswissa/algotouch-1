
import { toast } from 'sonner';
import { saveContractToDatabase, updateSubscriptionStatus } from './storage-service';

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
    
    // Save the contract signature to Supabase
    const saveResult = await saveContractToDatabase(userId, planId, fullName, email, contractData);
    
    if (!saveResult.success) {
      toast.error('שגיאה בשמירת החתימה');
      return false;
    }
    
    // Try to update the subscription status as well
    await updateSubscriptionStatus(userId);
    
    toast.success('ההסכם נחתם ונשמר בהצלחה!');
    return true;
  } catch (error) {
    console.error('Exception processing contract signature:', error);
    toast.error('שגיאה בעיבוד החתימה');
    return false;
  }
}

// Export other functions for backward compatibility
export * from './storage-service';
