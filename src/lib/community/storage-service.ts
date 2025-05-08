
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
    
    if (getBucketError) {
      if (getBucketError.message.includes('The bucket does not exist')) {
        console.log('Bucket does not exist, attempting to create it...');
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
        
        // Update bucket to make it public
        const { error: updateError } = await supabase.storage
          .updateBucket('community_media', {
            public: true
          });
        
        if (updateError) {
          console.error('Error making bucket public:', updateError);
          return false;
        }
        
        console.log('Created community media bucket successfully');
        return true;
      } else {
        console.error('Error checking community media bucket:', getBucketError);
        return false;
      }
    }
    
    console.log('Community media bucket exists:', bucket);
    return true;
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
    console.log('Initializing community storage...');
    const bucketExists = await ensureCommunityMediaBucketExists();
    
    if (!bucketExists) {
      toast.error('שגיאה באתחול אחסון המדיה לקהילה', {
        duration: 5000,
        position: 'top-center',
        id: 'storage-init-error',
      });
    } else {
      console.log('Community storage initialized successfully');
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
