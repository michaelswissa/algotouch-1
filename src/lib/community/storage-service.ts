
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Check if the storage bucket exists, and create it if it doesn't
 */
export async function ensureCommunityMediaBucketExists(): Promise<boolean> {
  try {
    // Check if the bucket exists
    const { data: bucket, error: getBucketError } = await supabase.storage
      .getBucket('community_media');
    
    if (getBucketError && getBucketError.message.includes('The bucket does not exist')) {
      // Create the bucket if it doesn't exist
      const { error: createBucketError } = await supabase.storage
        .createBucket('community_media', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });
      
      if (createBucketError) {
        console.error('Error creating community media bucket:', createBucketError);
        return false;
      }
      
      // Update bucket to make it public (use the appropriate method available in your Supabase version)
      try {
        // For newer Supabase versions
        const { error: updateError } = await supabase.storage
          .updateBucket('community_media', {
            public: true
          });
        
        if (updateError) {
          console.error('Error making bucket public:', updateError);
          return false;
        }
      } catch (err) {
        console.warn('Error updating bucket, may be using older Supabase version:', err);
        // Fallback for older versions or different API
      }
      
      console.log('Created community media bucket successfully');
      return true;
    }
    
    return !!bucket;
  } catch (error) {
    console.error('Exception in ensureCommunityMediaBucketExists:', error);
    return false;
  }
}

/**
 * Initialize storage for community features
 */
export async function initCommunityStorage(): Promise<void> {
  try {
    const bucketExists = await ensureCommunityMediaBucketExists();
    
    if (!bucketExists) {
      toast.error('שגיאה באתחול אחסון המדיה לקהילה', {
        duration: 5000,
        position: 'top-center',
        id: 'storage-init-error',
      });
    }
  } catch (error) {
    console.error('Error initializing community storage:', error);
    toast.error('שגיאה באתחול אחסון המדיה לקהילה', {
      duration: 5000,
      position: 'top-center',
      id: 'storage-init-error',
    });
  }
}
