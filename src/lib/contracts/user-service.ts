
import { supabase } from '@/integrations/supabase/client';

/**
 * Updates user metadata with additional information
 */
export async function updateUserMetadata(userId: string, metadata: any): Promise<boolean> {
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
