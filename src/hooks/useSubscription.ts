
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';

// Interface for Subscription from Supabase
export interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  payment_method: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
  } | Json | null;
}

// Interface for processed subscription details
export interface SubscriptionDetails {
  planName: string;
  planPrice: string;
  statusText: string;
  nextBillingDate: string;
  progressValue: number;
  daysLeft: number;
  paymentMethod: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
  } | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error) {
            throw error;
          }
          
          // Convert Supabase data to our Subscription type
          if (data) {
            const formattedSubscription: Subscription = {
              id: data.id,
              plan_type: data.plan_type,
              status: data.status,
              trial_ends_at: data.trial_ends_at,
              current_period_ends_at: data.current_period_ends_at,
              payment_method: data.payment_method
            };
            setSubscription(formattedSubscription);
            setSelectedPlan(data.plan_type);
            
            // Process the subscription details
            const subscriptionDetails = getSubscriptionDetails(formattedSubscription);
            setDetails(subscriptionDetails);
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [user]);

  const getSubscriptionDetails = (sub: Subscription | null): SubscriptionDetails | null => {
    if (!sub) return null;
    
    const planName = sub.plan_type === 'annual' ? 'שנתי' : 'חודשי';
    const planPrice = sub.plan_type === 'annual' ? '899' : '99';
    
    let statusText = '';
    let nextBillingDate = '';
    let progressValue = 0;
    let daysLeft = 0;
    
    if (sub.status === 'trial' && sub.trial_ends_at) {
      const trialEndDate = parseISO(sub.trial_ends_at);
      daysLeft = Math.max(0, differenceInDays(trialEndDate, new Date()));
      progressValue = Math.max(0, Math.min(100, (30 - daysLeft) / 30 * 100));
      
      statusText = 'בתקופת ניסיון';
      nextBillingDate = format(trialEndDate, 'dd/MM/yyyy', { locale: he });
    } else if (sub.current_period_ends_at) {
      const periodEndDate = parseISO(sub.current_period_ends_at);
      const periodStartDate = addMonths(periodEndDate, -1);
      daysLeft = Math.max(0, differenceInDays(periodEndDate, new Date()));
      const totalDays = differenceInDays(periodEndDate, periodStartDate);
      progressValue = Math.max(0, Math.min(100, (totalDays - daysLeft) / totalDays * 100));
      
      statusText = 'פעיל';
      nextBillingDate = format(periodEndDate, 'dd/MM/yyyy', { locale: he });
    }
    
    // Process payment method safely
    let paymentMethodDetails = null;
    if (sub.payment_method) {
      // Check if payment_method has the expected structure
      const paymentMethod = sub.payment_method as any;
      if (paymentMethod.lastFourDigits) {
        paymentMethodDetails = {
          lastFourDigits: paymentMethod.lastFourDigits,
          expiryMonth: paymentMethod.expiryMonth,
          expiryYear: paymentMethod.expiryYear
        };
      }
    }
    
    return {
      planName,
      planPrice,
      statusText,
      nextBillingDate,
      progressValue,
      daysLeft,
      paymentMethod: paymentMethodDetails
    };
  };

  return { subscription, loading, details, selectedPlan };
};
