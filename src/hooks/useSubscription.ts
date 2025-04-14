
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';

// Interface for Subscription from Supabase
interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  next_charge_date: string | null;
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
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
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
          next_charge_date: data.next_charge_date,
          payment_method: data.payment_method
        };
        
        // Check if subscription is expired
        const now = new Date();
        const isExpired = 
          (data.trial_ends_at && new Date(data.trial_ends_at) < now) || 
          (data.current_period_ends_at && new Date(data.current_period_ends_at) < now);
        
        // VIP subscriptions never expire
        const isVip = data.plan_type === 'vip';
        
        // Override status if expired (except for VIP)
        if (isExpired && !isVip && data.status !== 'cancelled') {
          formattedSubscription.status = 'expired';
          
          // Update the status in the database
          await supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('id', data.id);
        }
        
        setSubscription(formattedSubscription);
        
        // Process the subscription details
        const subscriptionDetails = getSubscriptionDetails(formattedSubscription);
        setDetails(subscriptionDetails);
      } else {
        setSubscription(null);
        setDetails(null);
      }
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const getSubscriptionDetails = (sub: Subscription | null): SubscriptionDetails | null => {
    if (!sub) return null;
    
    // Get Hebrew plan name and actual price in ILS
    const planName = sub.plan_type === 'annual' ? 'שנתי' : 
                    sub.plan_type === 'vip' ? 'VIP' : 'חודשי';
    
    // Set the actual ILS prices
    let planPrice = '';
    if (sub.plan_type === 'monthly') {
      planPrice = '371';
    } else if (sub.plan_type === 'annual') {
      planPrice = '3,371';
    } else if (sub.plan_type === 'vip') {
      planPrice = '13,121';
    }
    
    let statusText = '';
    let nextBillingDate = '';
    let progressValue = 0;
    let daysLeft = 0;
    
    // Set status text and next billing date based on subscription status
    if (sub.status === 'trial' && sub.trial_ends_at) {
      const trialEndDate = parseISO(sub.trial_ends_at);
      daysLeft = Math.max(0, differenceInDays(trialEndDate, new Date()));
      progressValue = Math.max(0, Math.min(100, (30 - daysLeft) / 30 * 100));
      
      statusText = 'בתקופת ניסיון';
      nextBillingDate = format(trialEndDate, 'dd/MM/yyyy', { locale: he });
    } else if (sub.status === 'expired') {
      statusText = 'פג תוקף';
      nextBillingDate = 'המנוי הסתיים';
      progressValue = 100;
      daysLeft = 0;
    } else if (sub.next_charge_date) {
      // Use next_charge_date if available
      const nextChargeDate = parseISO(sub.next_charge_date);
      nextBillingDate = format(nextChargeDate, 'dd/MM/yyyy', { locale: he });
      
      if (sub.status === 'active') {
        statusText = 'פעיל';
        
        // Calculate days left and progress based on either current_period_ends_at or next_charge_date
        const endDate = sub.current_period_ends_at 
          ? parseISO(sub.current_period_ends_at) 
          : nextChargeDate;
          
        const startDate = sub.plan_type === 'monthly' 
          ? addMonths(endDate, -1) 
          : addMonths(endDate, -12);
          
        daysLeft = Math.max(0, differenceInDays(endDate, new Date()));
        const totalDays = differenceInDays(endDate, startDate);
        progressValue = Math.max(0, Math.min(100, (totalDays - daysLeft) / totalDays * 100));
      } else if (sub.status === 'cancelled') {
        statusText = 'מבוטל';
      }
    } else if (sub.status === 'active' && sub.plan_type === 'vip') {
      // VIP plan has no end date
      statusText = 'פעיל לכל החיים';
      nextBillingDate = 'ללא חיוב נוסף';
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

  return { 
    subscription, 
    loading,
    error,
    details,
    refetch: fetchSubscription
  };
};
