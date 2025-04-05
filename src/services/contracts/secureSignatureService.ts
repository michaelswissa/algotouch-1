
import { supabase } from '@/integrations/supabase/client';
import { ContractSignatureData } from '@/types/payment';
import { toast } from 'sonner';

/**
 * Processes a signed contract, saving it to the database and sending confirmation
 */
export async function processSignedContract(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: ContractSignatureData
): Promise<boolean> {
  try {
    console.log('Processing signed contract for user:', { userId, planId, email });
    
    // Validation
    if (!userId || !planId || !email || !contractData) {
      console.error('Missing required parameters for processSignedContract:', { 
        hasUserId: Boolean(userId), 
        hasPlanId: Boolean(planId), 
        hasEmail: Boolean(email),
        hasContractData: Boolean(contractData)
      });
      toast.error('חסרים פרטים הכרחיים לעיבוד החוזה');
      return false;
    }
    
    // Try direct function call approach first
    try {
      const { data, error } = await supabase.functions.invoke('izidoc-sign', {
        body: {
          userId,
          planId,
          fullName,
          email,
          signature: contractData.signature,
          contractHtml: contractData.contractHtml,
          agreedToTerms: contractData.agreedToTerms,
          agreedToPrivacy: contractData.agreedToPrivacy,
          contractVersion: contractData.contractVersion || "1.0",
          browserInfo: contractData.browserInfo || {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        },
      });

      if (error) {
        throw error;
      }

      console.log('Contract processed successfully by izidoc-sign:', data);
      toast.success('ההסכם נחתם ונשמר בהצלחה!');
      return true;
    } catch (functionError) {
      console.warn('Edge function call failed, falling back to client-side processing', functionError);
      
      // Fallback: save contract directly
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
        .select('id')
        .single();

      if (error) {
        console.error('Error saving contract signature directly:', error);
        toast.error('שגיאה בשמירת החתימה');
        return false;
      }
      
      // Update subscription status
      await supabase
        .from('subscriptions')
        .update({
          contract_signed: true,
          contract_signed_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      toast.success('ההסכם נחתם בהצלחה!');
      return true;
    }
  } catch (error) {
    console.error('Exception processing contract signature:', error);
    toast.error('שגיאה בעיבוד החתימה');
    return false;
  }
}

/**
 * Verifies if a contract has been signed for a user
 */
export async function verifyContractSignature(
  userId: string
): Promise<{ signed: boolean; signedAt?: string }> {
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
