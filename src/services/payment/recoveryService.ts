
/**
 * Payment Recovery Service
 * Handles recovery of interrupted payment sessions
 */

import { supabase } from '@/lib/supabase-client';
import { PaymentSession } from '@/components/payment/hooks/types';

/**
 * Save payment session for potential recovery
 */
export async function savePaymentSession(sessionData: {
  userId?: string;
  email?: string;
  planId: string;
  paymentDetails?: any;
}): Promise<string | null> {
  try {
    const { userId, email, planId, paymentDetails } = sessionData;
    
    // Generate expiry time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Save session to database
    const { data, error } = await supabase
      .from('payment_sessions')
      .insert({
        user_id: userId || null,
        email: email || null,
        plan_id: planId,
        payment_details: paymentDetails || {},
        status: 'recovery',
        expires_at: expiresAt.toISOString()
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Error saving payment session:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Exception in savePaymentSession:', error);
    return null;
  }
}

/**
 * Get recovery session by ID
 */
export async function getRecoverySession(sessionId: string): Promise<PaymentSession | null> {
  try {
    const { data, error } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'recovery')
      .gt('expires_at', new Date().toISOString())
      .single();
      
    if (error || !data) {
      console.error('Error fetching recovery session:', error);
      return null;
    }
    
    return data as PaymentSession;
  } catch (error) {
    console.error('Exception in getRecoverySession:', error);
    return null;
  }
}

/**
 * Mark a session as completed
 */
export async function completeRecoverySession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_sessions')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
      
    if (error) {
      console.error('Error completing recovery session:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in completeRecoverySession:', error);
    return false;
  }
}

/**
 * Send recovery email to user
 */
export async function sendRecoveryEmail(
  email: string, 
  errorInfo: any, 
  sessionId: string | null
): Promise<boolean> {
  try {
    if (!email || !sessionId) return false;
    
    // Send recovery email via edge function
    const { error } = await supabase.functions.invoke('smtp-sender', {
      body: {
        to: email,
        subject: 'השלמת תהליך תשלום - AlgoTouch',
        template: 'payment-recovery',
        params: {
          recoveryUrl: `${window.location.origin}/subscription?recover=${sessionId}`,
          errorMessage: errorInfo?.errorMessage || 'אירעה שגיאה בתהליך התשלום',
          sessionId: sessionId
        }
      }
    });
    
    if (error) {
      console.error('Error sending recovery email:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in sendRecoveryEmail:', error);
    return false;
  }
}
