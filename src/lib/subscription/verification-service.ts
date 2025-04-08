
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  isPeriodValid: boolean;
  isPaused: boolean;
  isGracePeriod: boolean;
  hasPaymentIssue: boolean;
  lastPaymentFailure?: {
    date: string;
    reason: string;
  };
  gracePeriodDays?: number;
  nextPaymentDate?: string;
  trialDaysLeft?: number;
  statusText: string;
}

export interface SubscriptionDetails {
  planName: string;
  statusText: string;
  nextBillingDate: string | null;
  planPrice: number;
  daysLeft?: number;
  progressValue?: number;
  paymentMethod?: {
    lastFourDigits?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cardholderName?: string;
  };
  gracePeriodActive?: boolean;
  gracePeriodDays?: number;
  hasPaymentIssue?: boolean;
  paymentFailureReason?: string;
}

// Default grace period in days for failed payments
const DEFAULT_GRACE_PERIOD_DAYS = 7;

export const verifySubscriptionStatus = async (userId: string): Promise<SubscriptionStatus> => {
  try {
    // Fetch the subscription data
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    
    // Default status (no subscription)
    if (!subscription) {
      return {
        isActive: false,
        isTrial: false,
        isPeriodValid: false,
        isPaused: false,
        isGracePeriod: false,
        hasPaymentIssue: false,
        statusText: 'אין מנוי פעיל'
      };
    }
    
    const now = new Date();
    const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
    const currentPeriodEndsAt = subscription.current_period_ends_at 
      ? new Date(subscription.current_period_ends_at) 
      : null;
    
    // Check payment method validity
    const paymentMethodData = subscription.payment_method;
    const hasValidPaymentMethod = !!paymentMethodData;
    
    // Get payment failure information
    const hasPaymentIssue = paymentMethodData?.payment_failed || subscription.status === 'failed';
    const paymentFailure = paymentMethodData?.last_payment_failure;
    
    // Check for canceled subscription
    const isCancelled = subscription.cancelled_at !== null;
    
    // Calculate days left in trial if applicable
    let trialDaysLeft;
    if (trialEndsAt && trialEndsAt > now) {
      const diffTime = trialEndsAt.getTime() - now.getTime();
      trialDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Determine grace period status for failed payments
    let isGracePeriod = false;
    let gracePeriodDays;
    
    if (hasPaymentIssue && paymentFailure && paymentFailure.date) {
      const failureDate = new Date(paymentFailure.date);
      const gracePeriodEnd = new Date(failureDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + DEFAULT_GRACE_PERIOD_DAYS);
      
      if (now <= gracePeriodEnd) {
        isGracePeriod = true;
        const diffTime = gracePeriodEnd.getTime() - now.getTime();
        gracePeriodDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
    
    // Final active status determination
    const isActive = (
      subscription.status === 'active' || 
      (subscription.status === 'trial' && trialEndsAt && trialEndsAt > now) ||
      (currentPeriodEndsAt && currentPeriodEndsAt > now && !isCancelled) ||
      isGracePeriod
    );
    
    const isTrial = subscription.status === 'trial' && trialEndsAt && trialEndsAt > now;
    const isPeriodValid = currentPeriodEndsAt && currentPeriodEndsAt > now;
    const isPaused = subscription.status === 'paused';

    // Determine status text
    let statusText = 'פעיל';
    
    if (isTrial) {
      statusText = `בתקופת ניסיון (נותרו ${trialDaysLeft} ימים)`;
    } else if (isPaused) {
      statusText = 'מושהה';
    } else if (isCancelled) {
      statusText = 'בוטל';
    } else if (hasPaymentIssue) {
      if (isGracePeriod) {
        statusText = `בעיית תשלום (תקופת חסד: ${gracePeriodDays} ימים)`;
      } else {
        statusText = 'בעיית תשלום (נעול)';
      }
    } else if (!isActive) {
      statusText = 'לא פעיל';
    }

    return {
      isActive,
      isTrial,
      isPeriodValid,
      isPaused,
      isGracePeriod,
      hasPaymentIssue,
      lastPaymentFailure: paymentFailure,
      gracePeriodDays,
      nextPaymentDate: subscription.next_charge_date,
      trialDaysLeft,
      statusText
    };
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return {
      isActive: false,
      isTrial: false,
      isPeriodValid: false,
      isPaused: false,
      isGracePeriod: false,
      hasPaymentIssue: false,
      statusText: 'שגיאה בטעינת פרטי מנוי'
    };
  }
};

export const getSubscriptionDetails = async (userId: string): Promise<SubscriptionDetails | null> => {
  try {
    // Fetch the subscription data
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) throw error;
    if (!subscription) return null;
    
    // Get status info
    const status = await verifySubscriptionStatus(userId);
    
    // Get plan details
    let planName, planPrice;
    switch(subscription.plan_type) {
      case 'monthly':
        planName = 'חודשי';
        planPrice = 49.90;
        break;
      case 'annual':
        planName = 'שנתי';
        planPrice = 499.00;
        break;
      case 'vip':
        planName = 'VIP';
        planPrice = 999.00;
        break;
      default:
        planName = 'לא ידוע';
        planPrice = 0;
    }
    
    // Next billing date
    const nextBillingDate = subscription.trial_ends_at || subscription.current_period_ends_at;
    
    // Days left calculation
    let daysLeft;
    let progressValue;
    
    if (status.isTrial && status.trialDaysLeft) {
      daysLeft = status.trialDaysLeft;
      
      // Calculate progress value (% of trial completed)
      const trialTotal = 30; // Assuming 30-day trial
      progressValue = 100 - Math.floor((daysLeft / trialTotal) * 100);
    }
    
    // Format payment method
    const paymentMethod = subscription.payment_method 
      ? {
          lastFourDigits: subscription.payment_method.lastFourDigits,
          expiryMonth: subscription.payment_method.expiryMonth,
          expiryYear: subscription.payment_method.expiryYear,
          cardholderName: subscription.payment_method.cardholderName
        }
      : undefined;
    
    return {
      planName,
      statusText: status.statusText,
      nextBillingDate: nextBillingDate || null,
      planPrice,
      daysLeft,
      progressValue,
      paymentMethod,
      gracePeriodActive: status.isGracePeriod,
      gracePeriodDays: status.gracePeriodDays,
      hasPaymentIssue: status.hasPaymentIssue,
      paymentFailureReason: status.lastPaymentFailure?.reason
    };
  } catch (error) {
    console.error('Error getting subscription details:', error);
    return null;
  }
};

export const handlePaymentFailure = async (userId: string, failureReason: string): Promise<boolean> => {
  try {
    const now = new Date().toISOString();
    
    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (subError) throw subError;
    if (!subscription) return false;
    
    // Update payment method with failure info
    const paymentMethod = {
      ...(subscription.payment_method || {}),
      payment_failed: true,
      last_payment_failure: {
        date: now,
        reason: failureReason
      }
    };
    
    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'failed',
        payment_method: paymentMethod
      })
      .eq('user_id', userId);
      
    if (error) throw error;
    
    // Log payment failure to history
    await supabase.from('payment_history').insert({
      user_id: userId,
      subscription_id: subscription.id,
      amount: 0,
      status: 'failed',
      currency: 'ILS',
      payment_method: paymentMethod
    });
    
    return true;
  } catch (error) {
    console.error('Error handling payment failure:', error);
    return false;
  }
};

export const resolvePaymentIssue = async (userId: string, newPaymentMethod: any): Promise<boolean> => {
  try {
    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (subError) throw subError;
    if (!subscription) return false;
    
    // Update payment method and clear failure info
    const updatedPaymentMethod = {
      ...newPaymentMethod,
      payment_failed: false,
      last_payment_failure: null
    };
    
    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        payment_method: updatedPaymentMethod
      })
      .eq('user_id', userId);
      
    if (error) throw error;
    
    // Log payment method update to history
    await supabase.from('payment_history').insert({
      user_id: userId,
      subscription_id: subscription.id,
      amount: 0,
      status: 'payment_method_updated',
      currency: 'ILS',
      payment_method: updatedPaymentMethod
    });
    
    return true;
  } catch (error) {
    console.error('Error resolving payment issue:', error);
    return false;
  }
};
