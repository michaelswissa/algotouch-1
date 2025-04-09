
import { supabase } from '@/integrations/supabase/client';

// Send a recovery email to the user after a payment failure
export const sendRecoveryEmail = async (
  email: string,
  errorInfo: any,
  sessionId?: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('recover-payment-session', {
      body: {
        email,
        errorInfo,
        sessionId,
        recoveryUrl: `${window.location.origin}/subscription?recover=${sessionId}`
      }
    });
    
    if (error) {
      console.error('Error sending recovery email:', error);
      return false;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error('Exception sending recovery email:', error);
    return false;
  }
};

// Get payment session data for recovery
export const getRecoverySession = async (sessionId: string) => {
  try {
    const { data, error } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error retrieving payment session:', error);
    return null;
  }
};

// Save payment session for later recovery
export const savePaymentSession = async (sessionData: {
  userId?: string;
  email?: string;
  planId: string;
  paymentDetails?: any;
}) => {
  try {
    const sessionId = crypto.randomUUID();
    
    const { error } = await supabase
      .from('payment_sessions')
      .insert({
        id: sessionId,
        user_id: sessionData.userId,
        email: sessionData.email,
        plan_id: sessionData.planId,
        payment_details: sessionData.paymentDetails,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours expiry
      });
    
    if (error) {
      throw error;
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error saving payment session:', error);
    return null;
  }
};
