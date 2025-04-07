
import { supabase } from '@/integrations/supabase/client';
import { ContractData } from './izidoc-service';
import { toast } from 'sonner';

/**
 * Ensures that the contracts storage bucket exists
 */
export async function ensureContractsBucketExists(): Promise<boolean> {
  try {
    // Check if the bucket exists
    const { data: bucketExists, error: checkError } = await supabase.storage
      .getBucket('contracts');
    
    if (checkError) {
      console.log('Error checking bucket, attempting to create it:', checkError);
      // Try to create the bucket if it doesn't exist
      const { error: createError } = await supabase.storage
        .createBucket('contracts', {
          public: false,
          fileSizeLimit: 10485760, // 10MB
        });
      
      if (createError) {
        console.error('Error creating contracts bucket:', createError);
        return false;
      }
      
      return true;
    }
    
    return !!bucketExists;
  } catch (error) {
    console.error('Exception in ensureContractsBucketExists:', error);
    return false;
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
    // First ensure the storage bucket exists
    await ensureContractsBucketExists();
    
    // Store the contract HTML in storage first
    const contractFileName = `contract_${userId}_${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(contractData.contractHtml);
    
    console.log('Uploading contract to storage bucket for user:', userId);
    
    // Try to upload the contract to storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('contracts')
      .upload(`${userId}/${contractFileName}`, bytes, {
        contentType: 'text/html',
        upsert: true
      });
    
    if (storageError) {
      console.error('Error saving contract to storage:', storageError);
    } else {
      console.log('Contract saved to storage successfully:', storageData?.path);
    }
    
    // Store contract signature in the database
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
      return { success: false, error };
    }

    console.log('Contract signature saved successfully:', data);
    
    // Generate a URL to the saved contract
    const { data: urlData } = await supabase
      .storage
      .from('contracts')
      .createSignedUrl(`${userId}/${contractFileName}`, 60 * 60 * 24 * 7); // 7 days
    
    if (urlData?.signedUrl) {
      console.log('Contract signed URL created:', urlData.signedUrl);
      
      // Update the contract_signatures record with the PDF URL
      await supabase
        .from('contract_signatures')
        .update({
          pdf_url: urlData.signedUrl
        })
        .eq('id', data.id);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Exception saving contract signature:', error);
    return { success: false, error };
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
 * Gets the URL of a signed contract for a user
 */
export async function getContractURL(userId: string): Promise<string | null> {
  try {
    // First check if we have a stored URL in contract_signatures
    const { data: signature, error } = await supabase
      .from('contract_signatures')
      .select('pdf_url, contract_html')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error getting contract signature:', error);
      return null;
    }
    
    // If we have a stored URL, return it
    if (signature?.pdf_url) {
      return signature.pdf_url;
    }
    
    // If we have the HTML but no URL, create a new URL
    if (signature?.contract_html) {
      // List files in user's folder to find the contract
      const { data: files } = await supabase
        .storage
        .from('contracts')
        .list(userId);
      
      const contractFile = files?.find(file => file.name.startsWith('contract_'));
      
      if (contractFile) {
        // Create a signed URL
        const { data } = await supabase
          .storage
          .from('contracts')
          .createSignedUrl(`${userId}/${contractFile.name}`, 60 * 60 * 24 * 7); // 7 days
        
        if (data?.signedUrl) {
          // Update the record with the new URL
          await supabase
            .from('contract_signatures')
            .update({ pdf_url: data.signedUrl })
            .eq('id', signature.id);
          
          return data.signedUrl;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Exception getting contract URL:', error);
    return null;
  }
}
