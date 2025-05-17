
import { toast } from 'sonner';
import { saveContractToDatabase, updateSubscriptionStatus, callIzidocSignFunction } from './storage-service';
import { supabase } from '@/integrations/supabase/client';
import { ContractSignatureData, ContractDocument } from '@/services/subscription/types/contract';

/**
 * Processes a signed contract, saving it to the database and sending confirmation
 */
export async function processSignedContract(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: ContractSignatureData
): Promise<string | boolean> {
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
    
    // First try to use the edge function for processing
    console.log('Attempting to use izidoc-sign edge function');
    try {
      const { success, data, error } = await callIzidocSignFunction(
        userId, 
        planId, 
        fullName, 
        email, 
        contractData
      );
      
      if (success) {
        console.log('Contract processed successfully by edge function:', data);
        toast.success('ההסכם נחתם ונשמר בהצלחה!');
        return data.documentId || true;
      } else {
        console.error('Edge function error:', error);
        console.log('Falling back to client-side processing');
      }
    } catch (edgeFunctionError) {
      console.error('Edge function call failed:', edgeFunctionError);
      console.log('Falling back to client-side processing');
    }
    
    // Fallback to client-side processing
    console.log('Using client-side fallback for contract processing');
    const saveResult = await saveContractToDatabase(userId, planId, fullName, email, contractData);
    
    if (!saveResult.success) {
      console.error('Error saving contract:', saveResult.error);
      toast.error('שגיאה בשמירת החתימה');
      return false;
    }
    
    // Return the contract ID for potential redirects to view the contract
    const contractId = saveResult.data?.id;
    console.log('Contract saved with ID:', contractId);
    
    // Try to update the subscription status
    await updateSubscriptionStatus(userId);
    
    toast.success('ההסכם נחתם ונשמר בהצלחה!');
    return contractId || true;
  } catch (error) {
    console.error('Exception processing contract signature:', error);
    toast.error('שגיאה בעיבוד החתימה');
    return false;
  }
}

// Upload contract HTML to storage bucket
export async function uploadContractToStorage(
  userId: string,
  contractHtml: string,
  contractId: string
): Promise<{ success: boolean; url?: string; error?: any }> {
  try {
    console.log(`Uploading contract HTML to storage for user: ${userId}, contract: ${contractId}`);
    
    // Generate a file name based on contract ID
    const fileName = `${userId}/${contractId}.html`;
    
    // Upload the file to the contracts bucket
    const { data, error } = await supabase
      .storage
      .from('contracts')
      .upload(fileName, contractHtml, {
        contentType: 'text/html',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading contract to storage:', error);
      return { success: false, error };
    }
    
    console.log('Contract uploaded successfully to storage:', data?.path);
    
    // Create a URL for accessing the contract
    const { data: urlData } = await supabase
      .storage
      .from('contracts')
      .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 days expiry
    
    return { 
      success: true, 
      url: urlData?.signedUrl
    };
  } catch (error) {
    console.error('Exception uploading contract to storage:', error);
    return { success: false, error };
  }
}

// Export other functions for backward compatibility
export * from './storage-service';
