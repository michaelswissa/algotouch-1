
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Re-export all functionality from modular files
export * from './bucket-service';
export * from './email-service';
export * from './file-service';
export * from './izidoc-service';
export * from './user-service';
export * from './db-service';

// For backward compatibility, we're going to re-export the functions 
// but we'll use the imported functions rather than redefining them
import { uploadContractToStorage } from './file-service';
import { sendContractByEmail } from './email-service';
import { updateUserMetadata } from './user-service';

// Note: We're NOT defining the functions again, just re-exporting them
// They're already exported in their respective files and re-exported through the
// export * statements above
