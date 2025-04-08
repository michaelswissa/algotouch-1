
import { supabase } from '@/integrations/supabase/client';
import { ensureContractsBucketExists } from './bucket-service';

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
    
    // Ensure the contracts bucket exists
    const bucketExists = await ensureContractsBucketExists();
    if (!bucketExists) {
      console.error('Could not ensure contracts bucket exists');
      return { success: false, error: 'Could not ensure contracts bucket exists' };
    }
    
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
