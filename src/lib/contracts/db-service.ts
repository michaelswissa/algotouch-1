
import { supabase } from '@/integrations/supabase/client';
import { uploadContractToStorage } from './file-service';
import { sendContractByEmail } from './email-service';
import { updateUserMetadata } from './user-service';
import { ContractData } from './izidoc-service';

/**
 * Verifies if a contract has been signed
 */
export async function verifyContractSignature(userId: string): Promise<{ signed: boolean; signedAt?: string; contractId?: string }> {
  try {
    // First check the contract_signatures table
    const { data: contractData, error: contractError } = await supabase
      .from('contract_signatures')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .maybeSingle();
    
    if (contractData) {
      return { 
        signed: true,
        signedAt: contractData.created_at,
        contractId: contractData.id
      };
    }
    
    // If not found in contract table, check subscription table as fallback
    const { data, error } = await supabase
      .from('subscriptions')
      .select('contract_signed, contract_signed_at')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error verifying contract signature:', error);
      return { signed: false };
    }
    
    return { 
      signed: data?.contract_signed || false,
      signedAt: data?.contract_signed_at
    };
  } catch (error) {
    console.error('Exception verifying contract signature:', error);
    return { signed: false };
  }
}

/**
 * Gets a specific contract by ID
 */
export async function getContractById(contractId: string): Promise<{ success: boolean; contract?: any; error?: any }> {
  try {
    console.log('Fetching contract with ID:', contractId);
    const { data, error } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('id', contractId)
      .single();
    
    if (error) {
      console.error('Error retrieving contract:', error);
      return { success: false, error };
    }
    
    console.log('Contract retrieved successfully');
    return { success: true, contract: data };
  } catch (error) {
    console.error('Exception retrieving contract:', error);
    return { success: false, error };
  }
}

/**
 * Saves contract signature data directly to Supabase
 */
export async function saveContractToDatabase(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: ContractData
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    console.log('Saving contract for user:', userId, 'plan:', planId);
    
    // Validate inputs
    if (!userId || !contractData?.contractHtml || !contractData?.signature) {
      console.error('Missing required contract data');
      return { success: false, error: 'Missing required contract data' };
    }
    
    // Generate a unique contract ID to be used in URLs
    const contractId = crypto.randomUUID();
    
    // Try to upload HTML to storage
    const uploadResult = await uploadContractToStorage(userId, contractData.contractHtml, contractId);
    
    const pdfUrl = uploadResult.success ? uploadResult.url : null;
    console.log(uploadResult.success ? 'Contract uploaded to storage' : 'Failed to upload contract to storage');
    
    // Always send email with contract to support, as a backup
    try {
      await sendContractByEmail(userId, fullName, email, contractData.contractHtml, contractId);
    } catch (emailError) {
      console.error('Error sending contract by email:', emailError);
      // Continue even if email fails
    }
    
    // Store contract signature in the database
    const { data, error } = await supabase
      .from('contract_signatures')
      .insert({
        id: contractId,
        user_id: userId,
        plan_id: planId,
        full_name: fullName,
        email: email,
        signature: contractData.signature,
        contract_html: contractData.contractHtml,
        agreed_to_terms: contractData.agreedToTerms || false,
        agreed_to_privacy: contractData.agreedToPrivacy || false,
        contract_version: contractData.contractVersion || "1.0",
        pdf_url: pdfUrl,
        browser_info: contractData.browserInfo || {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error saving contract signature:', error);
      return { success: false, error };
    }

    console.log('Contract signature saved successfully:', data);
    
    // Update user metadata with link to the contract
    try {
      await updateUserMetadata(userId, {
        contractSignedId: contractId,
        contractSignedAt: new Date().toISOString()
      });
    } catch (metadataError) {
      console.error('Error updating user metadata:', metadataError);
      // We continue even if this fails as the contract is already saved
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Exception saving contract signature:', error);
    return { success: false, error };
  }
}
