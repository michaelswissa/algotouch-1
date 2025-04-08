
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Ensures the contracts storage bucket exists with proper configuration
 */
export async function ensureContractsBucketExists(): Promise<boolean> {
  try {
    // Check if the bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const contractsBucketExists = buckets?.some(bucket => bucket.name === 'contracts');
    
    if (!contractsBucketExists) {
      console.log('Contracts bucket does not exist, attempting to create it');
      const { error: createError } = await supabase.storage.createBucket('contracts', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['text/html', 'application/pdf']
      });
      
      if (createError) {
        console.error('Error creating contracts bucket:', createError);
        return false;
      }
      console.log('Created contracts bucket successfully');
    }
    
    return true;
  } catch (bucketCheckError) {
    console.error('Error checking for contracts bucket:', bucketCheckError);
    return false;
  }
}
