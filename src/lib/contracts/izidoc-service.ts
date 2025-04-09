
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
 * Calls the CardCom API to create an invoice/receipt for a payment
 */
export async function createPaymentDocument(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  paymentDetails: {
    amount: number;
    transactionId: string;
    currency: string;
    paymentMethod: any;
  }
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    console.log('Creating payment document:', {
      userId,
      planId,
      email,
      amount: paymentDetails.amount
    });
    
    // In a real implementation, we would call the CardCom API
    // For this example, we'll simulate success
    const documentData = {
      documentId: `doc-${Date.now()}`,
      documentUrl: `https://docs.example.com/invoices/invoice-${paymentDetails.transactionId}.pdf`,
      documentType: 'invoice',
      documentDate: new Date().toISOString()
    };
    
    return { success: true, data: documentData };
  } catch (error) {
    console.error('Exception creating payment document:', error);
    return { success: false, error };
  }
}

/**
 * Enhanced payment processing with retry logic
 */
export async function processPayment(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  paymentData: any,
  maxRetries = 2
): Promise<{ success: boolean; data?: any; error?: any }> {
  let retries = 0;
  let lastError = null;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Processing payment (attempt ${retries + 1}/${maxRetries + 1}):`, {
        userId,
        planId,
        email
      });
      
      // Here we would make the actual API call to CardCom
      // For now, let's simulate success after potential retries
      
      if (retries === 0 && Math.random() > 0.7) {
        // Simulate a transient error on first attempt
        throw new Error('Temporary network error');
      }
      
      // Simulate successful payment
      const paymentResult = {
        transactionId: `tx-${Date.now()}`,
        status: 'success',
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        processingDate: new Date().toISOString()
      };
      
      // Generate receipt/invoice
      await createPaymentDocument(userId, planId, fullName, email, {
        amount: paymentData.amount,
        transactionId: paymentResult.transactionId,
        currency: paymentData.currency || 'USD',
        paymentMethod: paymentData.paymentMethod
      });
      
      return { success: true, data: paymentResult };
    } catch (error) {
      lastError = error;
      console.error(`Payment processing error (attempt ${retries + 1}/${maxRetries + 1}):`, error);
      
      // Wait before retrying (exponential backoff)
      if (retries < maxRetries) {
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      retries++;
    }
  }
  
  return { success: false, error: lastError };
}
