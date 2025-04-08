
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        agreed_to_terms: contractData.agreedToTerms || false,
        agreed_to_privacy: contractData.agreedToPrivacy || false,
        contract_version: contractData.contractVersion || "1.0",
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
    
    // Update subscription status
    await updateSubscriptionStatus(userId);
    
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
 * Verifies if a contract has been signed
 */
export async function verifyContractSignature(userId: string): Promise<{ signed: boolean; signedAt?: string }> {
  try {
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
