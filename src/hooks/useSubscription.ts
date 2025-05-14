
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// Enhanced interfaces for better type safety
interface PaymentMethod {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
}

// Interface for Subscription from Supabase
interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  cancelled_at: string | null;
  payment_method: PaymentMethod | Json | null;
  contract_signed?: boolean | null;
}

// Interface for cancellation data
interface CancellationData {
  reason: string;
  feedback?: string;
}

// Interface for processed subscription details
export interface SubscriptionDetails {
  planName: string;
  planPrice: string;
  statusText: string;
  nextBillingDate: string;
  progressValue: number;
  daysLeft: number;
  paymentMethod: PaymentMethod | null;
  cancellationReason?: string;
  cancellationFeedback?: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format a date
  const formatDate = (dateString: string): string => {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: he });
  };

  // Helper function to calculate days left
  const calculateDaysLeft = (endDate: Date): number => {
    return Math.max(0, differenceInDays(endDate, new Date()));
  };

  // Helper function to calculate progress value
  const calculateProgress = (startDate: Date, endDate: Date, daysLeft: number): number => {
    const totalDays = differenceInDays(endDate, startDate);
    return Math.max(0, Math.min(100, (totalDays - daysLeft) / totalDays * 100));
  };

  // Helper function to safely process payment method data
  const processPaymentMethod = (paymentData: any): PaymentMethod | null => {
    if (!paymentData) return null;
    
    // Check if payment_method has the expected structure
    if (typeof paymentData === 'object' && paymentData.lastFourDigits) {
      return {
        lastFourDigits: paymentData.lastFourDigits,
        expiryMonth: paymentData.expiryMonth,
        expiryYear: paymentData.expiryYear
      };
    }
    return null;
  };

  // Function to fetch cancellation data
  const fetchCancellationData = async (subscriptionId: string): Promise<CancellationData | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-cancellation-data', {
        body: { subscriptionId }
      });
      
      if (error || !data || data.length === 0) return null;
      
      return {
        reason: data[0].reason,
        feedback: data[0].feedback
      };
    } catch (error) {
      console.error('Error fetching cancellation data:', error);
      return null;
    }
  };

  // Function to fetch subscription data
  const fetchSubscription = async (userId: string) => {
    try {
      setError(null);
      console.log('Fetching subscription for user:', userId);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error in subscription query:', error);
        throw error;
      }
      
      // Convert Supabase data to our Subscription type
      if (data) {
        console.log('Subscription data found:', data);
        const formattedSubscription: Subscription = {
          id: data.id,
          plan_type: data.plan_type,
          status: data.status,
          trial_ends_at: data.trial_ends_at,
          current_period_ends_at: data.current_period_ends_at,
          cancelled_at: data.cancelled_at,
          payment_method: data.payment_method,
          contract_signed: data.contract_signed
        };
        setSubscription(formattedSubscription);
        
        // Fetch cancellation data if available
        const cancellationData = await fetchCancellationData(data.id);
        
        // Process the subscription details
        const subscriptionDetails = getSubscriptionDetails(formattedSubscription, cancellationData);
        setDetails(subscriptionDetails);
        return { subscription: formattedSubscription, details: subscriptionDetails };
      } else {
        console.log('No subscription found for user:', userId);
        setSubscription(null);
        setDetails(null);
        return { subscription: null, details: null };
      }
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      setError('שגיאה בטעינת נתוני המנוי');
      // Show toast for unexpected errors
      toast.error('שגיאה בטעינת נתוני המנוי');
      return { error: error.message || 'שגיאה בטעינת נתוני המנוי' };
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchSubscription(user.id).finally(() => setLoading(false));
    } else {
      setSubscription(null);
      setDetails(null);
      setLoading(false);
    }
  }, [user]);

  const refreshSubscription = async () => {
    if (!user?.id) return false;
    
    setLoading(true);
    const result = await fetchSubscription(user.id);
    setLoading(false);
    
    return !result.error;
  };

  const getSubscriptionDetails = (sub: Subscription | null, cancellationData?: CancellationData | null): SubscriptionDetails | null => {
    if (!sub) return null;
    
    // Get plan name and price based on plan_type
    const planInfo = getPlanInfo(sub.plan_type);
    
    // Get status details based on subscription status
    const statusInfo = getStatusInfo(sub);
    
    // Process payment method
    const paymentMethodDetails = processPaymentMethod(sub.payment_method);
    
    return {
      ...planInfo,
      ...statusInfo,
      paymentMethod: paymentMethodDetails,
      cancellationReason: cancellationData?.reason,
      cancellationFeedback: cancellationData?.feedback
    };
  };

  // Helper to get plan information
  const getPlanInfo = (planType: string) => {
    const planName = planType === 'annual' ? 'שנתי' : 
                     planType === 'vip' ? 'VIP' : 'חודשי';
    const planPrice = planType === 'annual' ? '899' : 
                      planType === 'vip' ? '1499' : '99';
    
    return { planName, planPrice };
  };

  // Helper to get status information
  const getStatusInfo = (sub: Subscription) => {
    let statusText = '';
    let nextBillingDate = '';
    let progressValue = 0;
    let daysLeft = 0;
    
    // Handle cancelled subscription
    if (sub.status === 'cancelled') {
      statusText = 'מבוטל';
      
      if (sub.current_period_ends_at) {
        const periodEndDate = parseISO(sub.current_period_ends_at);
        nextBillingDate = formatDate(sub.current_period_ends_at);
        daysLeft = calculateDaysLeft(periodEndDate);
        progressValue = 100; // Show full progress for cancelled subscription
      } else {
        nextBillingDate = 'לא זמין';
        progressValue = 100;
      }
    }
    // Handle trial period
    else if (sub.status === 'trial' && sub.trial_ends_at) {
      const trialEndDate = parseISO(sub.trial_ends_at);
      daysLeft = calculateDaysLeft(trialEndDate);
      progressValue = Math.max(0, Math.min(100, (30 - daysLeft) / 30 * 100));
      
      statusText = 'בתקופת ניסיון';
      nextBillingDate = formatDate(sub.trial_ends_at);
    }
    // Handle active subscription
    else if (sub.current_period_ends_at) {
      const periodEndDate = parseISO(sub.current_period_ends_at);
      const periodStartDate = addMonths(periodEndDate, -1);
      daysLeft = calculateDaysLeft(periodEndDate);
      progressValue = calculateProgress(periodStartDate, periodEndDate, daysLeft);
      
      statusText = 'פעיל';
      nextBillingDate = formatDate(sub.current_period_ends_at);
    }
    
    return { statusText, nextBillingDate, progressValue, daysLeft };
  };

  // Function to cancel subscription with enhanced error handling
  const cancelSubscription = async (reason: string, feedback: string) => {
    try {
      if (!user?.id || !subscription?.id) {
        throw new Error('לא ניתן לבטל מנוי, אנא התחבר מחדש');
      }
      
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId: subscription.id,
          userId: user.id,
          reason,
          feedback
        }
      });
      
      if (error) {
        throw new Error(`אירעה שגיאה בביטול המנוי: ${error.message}`);
      }
      
      // Refresh subscription data
      await refreshSubscription();
      
      toast.success('המנוי בוטל בהצלחה');
      return true;
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      
      // Use error message from the error object if available
      const errorMessage = error.message || 'אירעה שגיאה בביטול המנוי';
      setError(errorMessage);
      toast.error(errorMessage);
      
      return false;
    }
  };

  // Function to reactivate cancelled subscription
  const reactivateSubscription = async () => {
    try {
      if (!user?.id || !subscription?.id) {
        throw new Error('לא ניתן להפעיל מחדש את המנוי, אנא התחבר מחדש');
      }
      
      const { error } = await supabase.functions.invoke('reactivate-subscription', {
        body: {
          subscriptionId: subscription.id,
          userId: user.id
        }
      });
      
      if (error) {
        throw new Error(`אירעה שגיאה בהפעלה מחדש של המנוי: ${error.message}`);
      }
      
      // Refresh subscription data
      await refreshSubscription();
      
      toast.success('המנוי הופעל מחדש בהצלחה');
      return true;
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      
      // Use error message from the error object if available
      const errorMessage = error.message || 'אירעה שגיאה בהפעלה מחדש של המנוי';
      setError(errorMessage);
      toast.error(errorMessage);
      
      return false;
    }
  };

  return { 
    subscription, 
    loading, 
    details, 
    error,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription
  };
};
