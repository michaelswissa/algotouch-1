
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { saveContractToLocalStorage, sendContractConfirmationEmail, sendContractToSupport } from './email-service';

/**
 * Interface for contract data used in signing process
 */
export interface ContractData {
  signature: string;
  contractHtml?: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  contractVersion?: string;
  browserInfo?: {
    userAgent: string;
    language: string;
    platform: string;
    screenSize: string;
    timeZone: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Directly calls the izidoc-sign function to process a contract
 */
export async function callIzidocSignFunction(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: ContractData
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    console.log('Calling izidoc-sign function directly:', {
      userId, 
      planId, 
      email, 
      hasSignature: !!contractData.signature,
      hasContractHtml: !!contractData.contractHtml
    });

    // First, save the contract to localStorage as a backup
    if (contractData.contractHtml) {
      const tempContractId = `temp_${new Date().getTime()}`;
      saveContractToLocalStorage(tempContractId, contractData.contractHtml);
    }
    
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
      
      // Try backup email sending if edge function fails
      if (contractData.contractHtml) {
        await sendContractConfirmationEmail(
          email,
          fullName,
          new Date().toISOString(),
          contractData.contractHtml
        );
        
        // Also send to support
        await sendContractToSupport(
          userId,
          fullName,
          email,
          contractData.contractHtml,
          `manual_${Date.now()}`
        );
      }
      
      return { success: false, error };
    }

    console.log('Contract processed successfully by izidoc-sign:', data);
    
    // If the contract HTML wasn't sent by email yet (from the edge function),
    // send it directly from here as a backup
    if (contractData.contractHtml && (!data.emailToCustomer || !data.emailToCustomer.success)) {
      console.log('Sending contract confirmation email as backup');
      await sendContractConfirmationEmail(
        email,
        fullName,
        new Date().toISOString(),
        contractData.contractHtml,
        data.documentId
      );
    }
    
    // Save to localStorage as an additional backup
    if (contractData.contractHtml && data.documentId) {
      saveContractToLocalStorage(data.documentId, contractData.contractHtml);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Exception calling izidoc-sign function:', error);
    
    // Try backup email sending if edge function fails
    if (contractData.contractHtml) {
      await sendContractConfirmationEmail(
        email,
        fullName,
        new Date().toISOString(),
        contractData.contractHtml
      );
    }
    
    return { success: false, error };
  }
}

// Function to download contract as HTML file
export function downloadContract(contractHtml: string, fullName: string = 'user') {
  if (!contractHtml) return false;
  
  try {
    const element = document.createElement('a');
    const file = new Blob([contractHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `contract-${fullName || 'user'}-${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    return true;
  } catch (error) {
    console.error('Error downloading contract:', error);
    return false;
  }
}
