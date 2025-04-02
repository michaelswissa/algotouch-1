
import React, { useEffect, useState } from 'react';
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

// Import our new components
import SubscriptionCard from './subscription/SubscriptionCard';
import SubscriptionStatus from './subscription/SubscriptionStatus';
import BillingInfo from './subscription/BillingInfo';
import PaymentMethodInfo from './subscription/PaymentMethodInfo';
import SubscriptionFooter from './subscription/SubscriptionFooter';
import LoadingSkeleton from './subscription/LoadingSkeleton';

// Updated Subscription interface to match the data structure from Supabase
interface Subscription {
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

interface SubscriptionDetails {
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

const UserSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

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
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchSubscription();
  }, [user]);

  const getSubscriptionDetails = (): SubscriptionDetails | null => {
    if (!subscription) return null;
    
    const planName = subscription.plan_type === 'annual' ? 'שנתי' : 'חודשי';
    const planPrice = subscription.plan_type === 'annual' ? '899' : '99';
    
    let statusText = '';
    let nextBillingDate = '';
    let progressValue = 0;
    let daysLeft = 0;
    
    if (subscription.status === 'trial' && subscription.trial_ends_at) {
      const trialEndDate = parseISO(subscription.trial_ends_at);
      daysLeft = Math.max(0, differenceInDays(trialEndDate, new Date()));
      progressValue = Math.max(0, Math.min(100, (30 - daysLeft) / 30 * 100));
      
      statusText = 'בתקופת ניסיון';
      nextBillingDate = format(trialEndDate, 'dd/MM/yyyy', { locale: he });
    } else if (subscription.current_period_ends_at) {
      const periodEndDate = parseISO(subscription.current_period_ends_at);
      const periodStartDate = addMonths(periodEndDate, -1);
      daysLeft = Math.max(0, differenceInDays(periodEndDate, new Date()));
      const totalDays = differenceInDays(periodEndDate, periodStartDate);
      progressValue = Math.max(0, Math.min(100, (totalDays - daysLeft) / totalDays * 100));
      
      statusText = 'פעיל';
      nextBillingDate = format(periodEndDate, 'dd/MM/yyyy', { locale: he });
    }
    
    // Process payment method safely
    let paymentMethodDetails = null;
    if (subscription.payment_method) {
      // Check if payment_method has the expected structure
      const paymentMethod = subscription.payment_method as any;
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

  if (loading) {
    return <LoadingSkeleton />;
  }

  const details = getSubscriptionDetails();

  if (!subscription) {
    return (
      <SubscriptionCard 
        title="אין לך מנוי פעיל" 
        description="הרשם עכשיו כדי לקבל גישה מלאה למערכת"
        showSubscribeButton={true}
      >
        <></>
      </SubscriptionCard>
    );
  }

  return (
    <SubscriptionCard
      title={`מנוי ${details?.planName}`}
      description={`סטטוס: ${details?.statusText}`}
    >
      <>
        {subscription.status === 'trial' && details && (
          <SubscriptionStatus 
            status={subscription.status} 
            daysLeft={details.daysLeft} 
            progressValue={details.progressValue} 
          />
        )}
        
        <div className="grid grid-cols-1 gap-4 mt-4">
          {details && (
            <>
              <BillingInfo 
                nextBillingDate={details.nextBillingDate} 
                planPrice={details.planPrice} 
              />
              
              <PaymentMethodInfo 
                paymentMethod={details.paymentMethod} 
              />
            </>
          )}
        </div>
      </>
      <SubscriptionFooter />
    </SubscriptionCard>
  );
};

export default UserSubscription;
