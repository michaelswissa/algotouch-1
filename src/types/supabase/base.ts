
import { Database as OriginalDatabase } from '@/integrations/supabase/types';

// Base Database type that will be extended by feature-specific types
export type BaseDatabase = OriginalDatabase;
