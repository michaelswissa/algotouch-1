
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

// Interface for Subscription from Supabase
interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  cancelled_at: string | null;
  payment_method: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
  } | Json | null;
  contract_signed?: boolean | null;
}

// Interface for cancellation data
interface CancellationData {
  reason?: string;
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
  paymentMethod: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
  } | null;
  cancellationReason?: string;
  cancellationFeedback?: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const { refreshSubscription: refreshContextSubscription, subscriptionDetails: contextSubscription } = useSubscriptionContext();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (user?.id) {
        try {
          setError(null);
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (error) {
            if (error.code === 'PGRST116') {
              // No subscription found for user, this is not an error, just no subscription
              console.log("No subscription found for user in useSubscription");
              setSubscription(null);
              setDetails(null);
              setLoading(false);
              return;
            }
            throw error;
          }
          
          // Convert Supabase data to our Subscription type
          if (data) {
            console.log("Found subscription in useSubscription:", data);
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
            
            // Try to fetch cancellation data if available
            let cancellationData: CancellationData | null = null;
            
            // Check if the subscription is cancelled before trying to fetch cancellation data
            if (data.cancelled_at) {
              try {
                // Check if table exists first by checking for table definition
                const { error: tableCheckError } = await supabase
                  .from('subscription_cancellations')
                  .select('id')
                  .limit(1);
                
                // If no error, the table exists
                if (!tableCheckError) {
                  const { data: cancelData, error: cancelError } = await supabase
                    .from('subscription_cancellations')
                    .select('reason, feedback')
                    .eq('subscription_id', data.id)
                    .limit(1)
                    .maybeSingle();
                  
                  if (cancelError) {
                    console.error("Error fetching cancellation data:", cancelError);
                  }
                  
                  if (cancelData) {
                    console.log("Found cancellation data:", cancelData);
                    cancellationData = cancelData;
                  }
                } else {
                  console.log("subscription_cancellations table does not exist or is not accessible");
                }
              } catch (cancelError) {
                console.error('Error fetching cancellation data:', cancelError);
                // Continue even if this fails
              }
            }
            
            // Process the subscription details
            const subscriptionDetails = getSubscriptionDetails(formattedSubscription, cancellationData);
            setDetails(subscriptionDetails);
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
          setError('שגיאה בטעינת נתוני המנוי');
          // Show toast for unexpected errors
          toast.error('שגיאה בטעינת נתוני המנוי');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, [user]);

  const getSubscriptionDetails = (sub: Subscription | null, cancellationData?: CancellationData | null): SubscriptionDetails | null => {
    if (!sub) return null;
    
    const planName = sub.plan_type === 'annual' ? 'שנתי' : 
                     sub.plan_type === 'vip' ? 'VIP' : 'חודשי';
    const planPrice = sub.plan_type === 'annual' ? '899' : 
                      sub.plan_type === 'vip' ? '1499' : '99';
    
    let statusText = '';
    let nextBillingDate = '';
    let progressValue = 0;
    let daysLeft = 0;
    
    // Handle cancelled subscription
    if (sub.status === 'cancelled') {
      statusText = 'מבוטל';
      
      if (sub.current_period_ends_at) {
        const periodEndDate = parseISO(sub.current_period_ends_at);
        nextBillingDate = format(periodEndDate, 'dd/MM/yyyy', { locale: he });
        daysLeft = Math.max(0, differenceInDays(periodEndDate, new Date()));
        progressValue = 100; // Show full progress for cancelled subscription
      } else {
        nextBillingDate = 'לא זמין';
        progressValue = 100;
      }
    }
    // Handle trial period
    else if (sub.status === 'trial' && sub.trial_ends_at) {
      const trialEndDate = parseISO(sub.trial_ends_at);
      daysLeft = Math.max(0, differenceInDays(trialEndDate, new Date()));
      progressValue = Math.max(0, Math.min(100, (30 - daysLeft) / 30 * 100));
      
      statusText = 'בתקופת ניסיון';
      nextBillingDate = format(trialEndDate, 'dd/MM/yyyy', { locale: he });
    }
    // Handle active subscription
    else if (sub.current_period_ends_at) {
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
    
    // Add cancellation reason and feedback if available
    let cancellationReason = undefined;
    let cancellationFeedback = undefined;
    
    if (cancellationData) {
      cancellationReason = cancellationData.reason;
      cancellationFeedback = cancellationData.feedback;
    }
    
    return {
      planName,
      planPrice,
      statusText,
      nextBillingDate,
      progressValue,
      daysLeft,
      paymentMethod: paymentMethodDetails,
      cancellationReason,
      cancellationFeedback
    };
  };

  // Function to cancel subscription with enhanced error handling
  const cancelSubscription = async (reason: string, feedback: string) => {
    try {
      if (!user?.id || !subscription?.id) {
        throw new Error('לא ניתן לבטל מנוי, אנא התחבר מחדש');
      }
      
      console.log("Cancelling subscription with reason:", reason);
      
      // First, update the subscription status in supabase
      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)
        .select()
        .single();
        
      if (updateError) {
        throw new Error(`שגיאה בביטול המנוי: ${updateError.message}`);
      }
      
      // Create a record in subscription_cancellations table
      try {
        // Try to insert cancellation reason
        const { error: cancelError } = await supabase
          .from('subscription_cancellations')
          .insert({
            subscription_id: subscription.id,
            user_id: user.id,
            reason: reason,
            feedback: feedback || null,
            cancelled_at: new Date().toISOString()
          });
          
        if (cancelError) {
          console.error("Error recording cancellation reason:", cancelError);
        }
      } catch (e) {
        console.error("Error creating cancellation record:", e);
        // Continue execution, this is not critical
      }
      
      if (updatedSub) {
        // Update local state with cancelled subscription
        const updatedSubscription: Subscription = {
          ...subscription,
          status: 'cancelled',
          cancelled_at: updatedSub.cancelled_at
        };
        
        setSubscription(updatedSubscription);
        
        // Update details with cancellation info
        const updatedDetails = getSubscriptionDetails(updatedSubscription, {
          reason,
          feedback
        });
        setDetails(updatedDetails);
      }
      
      // Also refresh the context's subscription data
      refreshContextSubscription();
      
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
      
      console.log("Reactivating subscription:", subscription.id);
      
      // Call the reactivate-subscription edge function
      const { data, error } = await supabase.functions.invoke('reactivate-subscription', {
        body: {
          subscriptionId: subscription.id,
          userId: user.id
        }
      });
      
      if (error) {
        throw new Error(`אירעה שגיאה בהפעלה מחדש של המנוי: ${error.message}`);
      }
      
      console.log("Reactivation response:", data);
      
      // Refresh the subscription data
      const { data: updatedData, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscription.id)
        .single();
        
      if (fetchError) {
        throw fetchError;
      }
      
      if (updatedData) {
        // Update local state with reactivated subscription
        const updatedSubscription: Subscription = {
          ...subscription,
          status: updatedData.status,
          cancelled_at: null
        };
        
        setSubscription(updatedSubscription);
        
        // Update details
        const updatedDetails = getSubscriptionDetails(updatedSubscription);
        setDetails(updatedDetails);
        
        // Also refresh the context's subscription data
        refreshContextSubscription();
      }
      
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
    reactivateSubscription
  };
};
