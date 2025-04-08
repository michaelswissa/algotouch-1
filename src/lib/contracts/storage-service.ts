
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Calls the izidoc-sign edge function
 */
export async function callIzidocSignFunction(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: any
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    console.log('Calling izidoc-sign edge function:', {
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
      console.error('Error from izidoc-sign edge function:', error);
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
 * Saves contract signature data directly to Supabase
 */
export async function saveContractToDatabase(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: any
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
    
    // Update subscription status
    await updateSubscriptionStatus(userId);
    
    return { success: true, data };
  } catch (error) {
    console.error('Exception saving contract signature:', error);
    return { success: false, error };
  }
}

/**
 * Uploads contract HTML to storage bucket
 */
export async function uploadContractToStorage(
  userId: string,
  contractHtml: string,
  contractId: string
): Promise<{ success: boolean; url?: string; error?: any }> {
  try {
    console.log(`Uploading contract HTML to storage for user: ${userId}, contract: ${contractId}`);
    
    // Generate a file name based on contract ID
    const fileName = `${userId}/${contractId}.html`;
    
    // Prepare the file content
    const encoder = new TextEncoder();
    const bytes = encoder.encode(contractHtml);
    
    // Upload the file to the contracts bucket
    const { data, error } = await supabase
      .storage
      .from('contracts')
      .upload(fileName, bytes, {
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

/**
 * Updates user metadata with additional information
 */
async function updateUserMetadata(userId: string, metadata: any): Promise<boolean> {
  try {
    // We can't directly access auth.admin from the client,
    // so we'll update the profiles table instead
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        updated_at: new Date().toISOString(),
        ...metadata
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating user profile metadata:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception updating user metadata:', error);
    return false;
  }
}

/**
 * Updates subscription status with contract information
 */
export async function updateSubscriptionStatus(userId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        contract_signed: true,
        contract_signed_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating subscription status:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exception updating subscription:', error);
    return { success: false, error };
  }
}

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
