
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseISO, isAfter, addDays } from 'date-fns';

export interface SubscriptionStatus {
  isActive: boolean;
  requiresPaymentUpdate: boolean;
  hasCompletedRegistration: boolean;
  hasSignedContract: boolean;
  gracePeriodDays: number | null;
  errorMessage?: string;
  redirectTo?: string;
}

/**
 * Verifies the complete subscription status for a user
 * Checks for active payments, completed registration, and signed contracts
 */
export async function verifySubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    if (!userId) {
      return {
        isActive: false,
        requiresPaymentUpdate: false,
        hasCompletedRegistration: false,
        hasSignedContract: false,
        gracePeriodDays: null,
        errorMessage: 'משתמש לא מחובר',
        redirectTo: '/auth'
      };
    }
    
    // First, check if the user has completed registration
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile || (!profile.first_name && !profile.last_name)) {
      return {
        isActive: false,
        requiresPaymentUpdate: false,
        hasCompletedRegistration: false,
        hasSignedContract: false,
        gracePeriodDays: null,
        errorMessage: 'הרשמה לא הושלמה',
        redirectTo: '/subscription?step=1'
      };
    }
    
    // Then, check if user has a subscription record
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (subError || !subscription) {
      return {
        isActive: false,
        requiresPaymentUpdate: false,
        hasCompletedRegistration: true,
        hasSignedContract: false,
        gracePeriodDays: null,
        errorMessage: 'לא נמצא מנוי פעיל',
        redirectTo: '/subscription?step=1'
      };
    }
    
    // Check if contract has been signed
    const hasSignedContract = subscription.contract_signed === true;
    
    if (!hasSignedContract) {
      return {
        isActive: false,
        requiresPaymentUpdate: false,
        hasCompletedRegistration: true,
        hasSignedContract: false,
        gracePeriodDays: null,
        errorMessage: 'נדרשת חתימה על הסכם',
        redirectTo: '/subscription?step=2'
      };
    }
    
    // Check for failed payments
    const { data: paymentHistory, error: paymentError } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1);
    
    const hasFailedPayment = paymentHistory && paymentHistory.length > 0;
    
    // Check if subscription is active by date
    const now = new Date();
    const trialEndsAt = subscription.trial_ends_at ? parseISO(subscription.trial_ends_at) : null;
    const periodEndsAt = subscription.current_period_ends_at ? parseISO(subscription.current_period_ends_at) : null;
    
    // Add a 7-day grace period for failed payments
    const gracePeriod = periodEndsAt ? addDays(periodEndsAt, 7) : null;
    const gracePeriodDays = gracePeriod && isAfter(gracePeriod, now) 
      ? Math.ceil((gracePeriod.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
      : null;
    
    // Check if subscription is active
    const isInTrialPeriod = trialEndsAt && isAfter(trialEndsAt, now);
    const isInActivePeriod = periodEndsAt && isAfter(periodEndsAt, now);
    const isInGracePeriod = gracePeriod && isAfter(gracePeriod, now);
    
    // Different subscription status conditions
    if (subscription.status === 'canceled' || subscription.cancelled_at) {
      return {
        isActive: isInActivePeriod, // Still active until the end of the period
        requiresPaymentUpdate: false,
        hasCompletedRegistration: true,
        hasSignedContract: true,
        gracePeriodDays: null,
        errorMessage: isInActivePeriod ? undefined : 'המנוי בוטל',
        redirectTo: isInActivePeriod ? undefined : '/subscription?step=1'
      };
    }
    
    if (hasFailedPayment) {
      return {
        isActive: isInGracePeriod, // Allow grace period
        requiresPaymentUpdate: true,
        hasCompletedRegistration: true,
        hasSignedContract: true,
        gracePeriodDays: gracePeriodDays,
        errorMessage: 'תשלום אחרון נכשל, נא לעדכן פרטי תשלום',
        redirectTo: '/update-payment'
      };
    }
    
    if (subscription.status === 'trial') {
      return {
        isActive: isInTrialPeriod,
        requiresPaymentUpdate: false,
        hasCompletedRegistration: true,
        hasSignedContract: true,
        gracePeriodDays: null,
        errorMessage: isInTrialPeriod ? undefined : 'תקופת הניסיון הסתיימה',
        redirectTo: isInTrialPeriod ? undefined : '/update-payment'
      };
    }
    
    return {
      isActive: isInActivePeriod || isInTrialPeriod,
      requiresPaymentUpdate: false,
      hasCompletedRegistration: true,
      hasSignedContract: true,
      gracePeriodDays: null,
      errorMessage: isInActivePeriod || isInTrialPeriod ? undefined : 'המנוי הסתיים',
      redirectTo: isInActivePeriod || isInTrialPeriod ? undefined : '/update-payment'
    };
  } catch (error) {
    console.error('Error verifying subscription status:', error);
    return {
      isActive: false,
      requiresPaymentUpdate: false,
      hasCompletedRegistration: false,
      hasSignedContract: false,
      gracePeriodDays: null,
      errorMessage: 'שגיאה בבדיקת מנוי',
      redirectTo: '/subscription'
    };
  }
}

/**
 * Updates subscription with details of failed payment attempt
 */
export async function recordFailedPayment(
  userId: string, 
  subscriptionId: string, 
  error: any,
  paymentMethod: any
): Promise<boolean> {
  try {
    // Record the failed payment in history
    await supabase.from('payment_history').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      amount: 0, // Failed payment
      status: 'failed',
      payment_method: paymentMethod,
      currency: 'ILS'
    });
    
    // Update subscription with last payment failure info
    await supabase
      .from('subscriptions')
      .update({
        last_payment_failure: new Date().toISOString(),
        payment_failure_reason: error?.message || 'Unknown error'
      })
      .eq('id', subscriptionId);
    
    return true;
  } catch (error) {
    console.error('Error recording failed payment:', error);
    return false;
  }
}

/**
 * Clears failed payment status after successful payment
 */
export async function clearFailedPaymentStatus(subscriptionId: string): Promise<boolean> {
  try {
    await supabase
      .from('subscriptions')
      .update({
        last_payment_failure: null,
        payment_failure_reason: null
      })
      .eq('id', subscriptionId);
    
    return true;
  } catch (error) {
    console.error('Error clearing failed payment status:', error);
    return false;
  }
}
