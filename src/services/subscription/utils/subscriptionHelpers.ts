
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';
import { PaymentMethod, Subscription, SubscriptionDetails } from '../types';

/**
 * Format a date string to the Israeli format
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'לא זמין';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: he });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'לא זמין';
  }
};

/**
 * Calculate days left until a given date
 */
export const calculateDaysLeft = (endDate: Date): number => {
  if (!endDate) return 0;
  return Math.max(0, differenceInDays(endDate, new Date()));
};

/**
 * Calculate progress value based on start date, end date, and days left
 */
export const calculateProgress = (startDate: Date, endDate: Date, daysLeft: number): number => {
  if (!startDate || !endDate) return 0;
  const totalDays = differenceInDays(endDate, startDate);
  return Math.max(0, Math.min(100, (totalDays - daysLeft) / totalDays * 100));
};

/**
 * Process payment method data safely
 */
export const processPaymentMethod = (paymentData: any): PaymentMethod | null => {
  if (!paymentData) return null;
  
  // Check if payment_method has the expected structure
  if (typeof paymentData === 'object' && paymentData.lastFourDigits) {
    return {
      lastFourDigits: paymentData.lastFourDigits,
      expiryMonth: paymentData.expiryMonth,
      expiryYear: paymentData.expiryYear,
      cardholderName: paymentData.cardholderName
    };
  }
  return null;
};

/**
 * Get plan information based on plan type
 */
export const getPlanInfo = (planType: string) => {
  const planName = planType === 'annual' ? 'שנתי' : 
                   planType === 'vip' ? 'VIP' : 'חודשי';
  const planPrice = planType === 'annual' ? '899' : 
                    planType === 'vip' ? '1499' : '99';
  
  return { planName, planPrice };
};

/**
 * Get status information based on subscription
 */
export const getStatusInfo = (subscription: Subscription) => {
  let statusText = '';
  let nextBillingDate = '';
  let progressValue = 0;
  let daysLeft = 0;
  
  // Handle cancelled subscription
  if (subscription.status === 'cancelled') {
    statusText = 'מבוטל';
    
    if (subscription.current_period_ends_at) {
      const periodEndDate = parseISO(subscription.current_period_ends_at);
      nextBillingDate = formatDate(subscription.current_period_ends_at);
      daysLeft = calculateDaysLeft(periodEndDate);
      progressValue = 100; // Show full progress for cancelled subscription
    } else {
      nextBillingDate = 'לא זמין';
      progressValue = 100;
    }
  }
  // Handle trial period
  else if (subscription.status === 'trial' && subscription.trial_ends_at) {
    const trialEndDate = parseISO(subscription.trial_ends_at);
    daysLeft = calculateDaysLeft(trialEndDate);
    progressValue = Math.max(0, Math.min(100, (30 - daysLeft) / 30 * 100));
    
    statusText = 'בתקופת ניסיון';
    nextBillingDate = formatDate(subscription.trial_ends_at);
  }
  // Handle active subscription
  else if (subscription.current_period_ends_at) {
    const periodEndDate = parseISO(subscription.current_period_ends_at);
    const periodStartDate = addMonths(periodEndDate, -1);
    daysLeft = calculateDaysLeft(periodEndDate);
    progressValue = calculateProgress(periodStartDate, periodEndDate, daysLeft);
    
    statusText = 'פעיל';
    nextBillingDate = formatDate(subscription.current_period_ends_at);
  } else {
    // Fallback for missing date information
    statusText = subscription.status || 'לא ידוע';
    nextBillingDate = 'לא זמין';
    progressValue = 0;
    daysLeft = 0;
  }
  
  return { statusText, nextBillingDate, progressValue, daysLeft };
};

/**
 * Process subscription details
 */
export const getSubscriptionDetails = (
  subscription: Subscription | null, 
  cancellationData?: { reason: string; feedback?: string } | null
): SubscriptionDetails | null => {
  if (!subscription) return null;
  
  // Get plan name and price based on plan_type
  const planInfo = getPlanInfo(subscription.plan_type || 'monthly');
  
  // Get status details based on subscription status
  const statusInfo = getStatusInfo(subscription);
  
  // Process payment method
  const paymentMethodDetails = processPaymentMethod(subscription.payment_method);
  
  return {
    ...planInfo,
    ...statusInfo,
    paymentMethod: paymentMethodDetails,
    cancellationReason: cancellationData?.reason,
    cancellationFeedback: cancellationData?.feedback
  };
};
