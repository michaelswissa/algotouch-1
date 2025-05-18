
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
export const calculateDaysLeft = (endDate: Date | null): number => {
  if (!endDate) return 0;
  try {
    return Math.max(0, differenceInDays(endDate, new Date()));
  } catch (error) {
    console.error('Error calculating days left:', error);
    return 0;
  }
};

/**
 * Calculate progress value based on start date, end date, and days left
 */
export const calculateProgress = (startDate: Date | null, endDate: Date | null, daysLeft: number): number => {
  if (!startDate || !endDate) return 0;
  try {
    const totalDays = differenceInDays(endDate, startDate);
    if (totalDays <= 0) return 0; // Avoid division by zero
    return Math.max(0, Math.min(100, (totalDays - daysLeft) / totalDays * 100));
  } catch (error) {
    console.error('Error calculating progress:', error);
    return 0;
  }
};

/**
 * Process payment method data safely
 */
export const processPaymentMethod = (paymentData: any): PaymentMethod | null => {
  if (!paymentData) return null;
  
  try {
    // Check if payment_method has the expected structure
    if (typeof paymentData === 'object' && paymentData.lastFourDigits) {
      return {
        lastFourDigits: paymentData.lastFourDigits,
        expiryMonth: paymentData.expiryMonth,
        expiryYear: paymentData.expiryYear,
        cardholderName: paymentData.cardholderName
      };
    }
  } catch (error) {
    console.error('Error processing payment method:', error);
  }
  return null;
};

/**
 * Get plan information based on plan type
 */
export const getPlanInfo = (planType: string | null | undefined) => {
  if (!planType) {
    return { planName: 'לא ידוע', planPrice: '0' };
  }
  
  const planName = planType === 'annual' ? 'שנתי' : 
                   planType === 'vip' ? 'VIP' : 'חודשי';
  const planPrice = planType === 'annual' ? '899' : 
                    planType === 'vip' ? '1499' : '99';
  
  return { planName, planPrice };
};

/**
 * Get status information based on subscription
 */
export const getStatusInfo = (subscription: Subscription | null) => {
  let statusText = 'לא ידוע';
  let nextBillingDate = 'לא זמין';
  let progressValue = 0;
  let daysLeft = 0;
  
  if (!subscription) {
    return { statusText, nextBillingDate, progressValue, daysLeft };
  }
  
  try {
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
      // Generate a start date if it's not available
      const periodStartDate = subscription.created_at ? 
        parseISO(subscription.created_at) : 
        addMonths(periodEndDate, -1);
        
      daysLeft = calculateDaysLeft(periodEndDate);
      progressValue = calculateProgress(periodStartDate, periodEndDate, daysLeft);
      
      statusText = subscription.status === 'active' ? 'פעיל' : subscription.status || 'לא ידוע';
      nextBillingDate = formatDate(subscription.current_period_ends_at);
    } 
    // Fallback if ends_at is missing - use current date + 30 days as estimate
    else if (subscription.status === 'active') {
      const estimatedEndDate = addMonths(new Date(), 1);
      const startDate = subscription.created_at ? 
        parseISO(subscription.created_at) : 
        addMonths(estimatedEndDate, -1);
        
      daysLeft = 30; // Assume one month remaining
      progressValue = calculateProgress(startDate, estimatedEndDate, daysLeft);
      
      statusText = 'פעיל';
      nextBillingDate = formatDate(estimatedEndDate.toISOString());
    } else {
      // Fallback for missing date information
      statusText = subscription.status || 'לא ידוע';
      nextBillingDate = 'לא זמין';
      progressValue = 0;
      daysLeft = 0;
    }
  } catch (error) {
    console.error('Error in getStatusInfo:', error);
    // Safe fallback
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
  
  try {
    // Get plan name and price based on plan_type
    const planInfo = getPlanInfo(subscription.plan_type);
    
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
  } catch (error) {
    console.error('Error in getSubscriptionDetails:', error);
    
    // Return a minimal valid object in case of error
    return {
      planName: 'לא ידוע',
      planPrice: '0',
      statusText: 'שגיאה',
      nextBillingDate: 'לא זמין',
      progressValue: 0,
      daysLeft: 0,
      paymentMethod: null
    };
  }
};
