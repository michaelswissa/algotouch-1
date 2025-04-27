
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Helper function to create/assign admin role to a user by email
 * Uses the edge function to avoid exposing direct DB operations
 */
export async function assignAdminRole(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('assign-admin', {
      body: { email }
    });

    if (error) {
      console.error('Error assigning admin role:', error);
      toast.error(`Failed to assign admin role: ${error.message}`);
      return false;
    }

    toast.success(`Admin role assigned to ${email}`);
    return true;
  } catch (err) {
    console.error('Exception assigning admin role:', err);
    toast.error('An unexpected error occurred');
    return false;
  }
}
