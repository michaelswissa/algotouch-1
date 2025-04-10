
import { supabase } from '@/integrations/supabase/client';
import { PaymentSessionData } from '@/types/payment';

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
export const getRecoverySession = async (sessionId: string): Promise<PaymentSessionData | null> => {
  try {
    // Try with the edge function instead of direct DB access
    return await getRecoverySessionViaFunction(sessionId);
  } catch (error) {
    console.error('Error retrieving payment session:', error);
    return null;
  }
};

// Fallback method using edge function
const getRecoverySessionViaFunction = async (sessionId: string): Promise<PaymentSessionData | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('recover-payment-session/get-session', {
      body: { sessionId }
    });
    
    if (error || !data) {
      throw error || new Error('No data returned');
    }
    
    // Map the database column names to our TypeScript interface property names
    return {
      sessionId: data.id,
      userId: data.user_id,
      email: data.email,
      planId: data.plan_id,
      paymentDetails: data.payment_details,
      expiresAt: data.expires_at
    };
  } catch (error) {
    console.error('Error retrieving payment session via function:', error);
    return null;
  }
};

// Save payment session for later recovery
export const savePaymentSession = async (sessionData: {
  userId?: string;
  email?: string;
  planId: string;
  paymentDetails?: any;
}): Promise<string | null> => {
  try {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
    
    try {
      // Try via edge function instead of direct DB access
      const { data, error } = await supabase.functions.invoke('recover-payment-session/save-session', {
        body: {
          sessionId,
          userId: sessionData.userId,
          email: sessionData.email,
          planId: sessionData.planId,
          paymentDetails: sessionData.paymentDetails,
          expiresAt: expiresAt.toISOString()
        }
      });
      
      if (error) {
        throw error;
      }
      
      return sessionId;
    } catch (dbError) {
      console.error('Failed to save payment session:', dbError);
      return null;
    }
  } catch (error) {
    console.error('Error saving payment session:', error);
    return null;
  }
};
