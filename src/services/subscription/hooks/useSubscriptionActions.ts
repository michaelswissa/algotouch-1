
import { useState } from 'react';
import { toast } from 'sonner';
import { cancelSubscription } from '../actions/cancelSubscription';
import { reactivateSubscription } from '../actions/reactivateSubscription';
import { checkSubscriptionStatus } from '../actions/checkSubscriptionStatus';
import { fetchCancellationData } from '../actions/fetchCancellationData';
import { ActionStatus, Subscription, SubscriptionDetails } from '../types';
import { getSubscriptionDetails } from '../utils/subscriptionHelpers';

interface UseSubscriptionActionsProps {
  userId?: string;
  subscriptionId?: string;
  onSuccess?: (action: string) => void;
  onError?: (error: Error, action: string) => void;
}

export const useSubscriptionActions = ({
  userId,
  subscriptionId,
  onSuccess,
  onError
}: UseSubscriptionActionsProps = {}) => {
  const [status, setStatus] = useState<ActionStatus>({
    loading: false,
    error: null,
    lastUpdated: null
  });
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  
  /**
   * Cancel the subscription
   */
  const handleCancelSubscription = async (reason: string, feedback?: string) => {
    if (!userId || !subscriptionId) {
      toast.error('לא ניתן לבטל מנוי, אנא התחבר מחדש');
      return false;
    }
    
    setStatus({ ...status, loading: true, error: null });
    
    const result = await cancelSubscription({
      userId,
      subscriptionId,
      reason,
      feedback
    });
    
    if (result.success) {
      toast.success(result.message || 'המנוי בוטל בהצלחה');
      setStatus({
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
      
      // Refresh subscription data
      await refreshSubscription();
      
      if (onSuccess) {
        onSuccess('cancel');
      }
      
      return true;
    } else {
      setStatus({
        loading: false,
        error: result.error || new Error(result.message || 'שגיאה לא ידועה'),
        lastUpdated: new Date()
      });
      
      if (onError && result.error) {
        onError(result.error, 'cancel');
      }
      
      return false;
    }
  };
  
  /**
   * Reactivate a cancelled subscription
   */
  const handleReactivateSubscription = async () => {
    if (!userId || !subscriptionId) {
      toast.error('לא ניתן להפעיל מחדש את המנוי, אנא התחבר מחדש');
      return false;
    }
    
    setStatus({ ...status, loading: true, error: null });
    
    const result = await reactivateSubscription({
      userId,
      subscriptionId
    });
    
    if (result.success) {
      toast.success(result.message || 'המנוי הופעל מחדש בהצלחה');
      setStatus({
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
      
      // Refresh subscription data
      await refreshSubscription();
      
      if (onSuccess) {
        onSuccess('reactivate');
      }
      
      return true;
    } else {
      setStatus({
        loading: false,
        error: result.error || new Error(result.message || 'שגיאה לא ידועה'),
        lastUpdated: new Date()
      });
      
      if (onError && result.error) {
        onError(result.error, 'reactivate');
      }
      
      return false;
    }
  };
  
  /**
   * Refresh subscription data
   */
  const refreshSubscription = async () => {
    if (!userId) return false;
    
    setStatus({ ...status, loading: true, error: null });
    
    const result = await checkSubscriptionStatus({ userId });
    
    if (result.success && result.data) {
      setSubscription(result.data);
      
      // Fetch cancellation data if available
      if (result.data.id) {
        const cancellationResult = await fetchCancellationData({
          subscriptionId: result.data.id
        });
        
        if (cancellationResult.success) {
          const subscriptionDetails = getSubscriptionDetails(result.data, cancellationResult.data);
          setDetails(subscriptionDetails);
        } else {
          const subscriptionDetails = getSubscriptionDetails(result.data);
          setDetails(subscriptionDetails);
        }
      }
      
      setStatus({
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
      
      return true;
    } else {
      setSubscription(null);
      setDetails(null);
      
      setStatus({
        loading: false,
        error: result.error || null,
        lastUpdated: new Date()
      });
      
      return false;
    }
  };
  
  return {
    subscription,
    details,
    status,
    cancelSubscription: handleCancelSubscription,
    reactivateSubscription: handleReactivateSubscription,
    refreshSubscription
  };
};
