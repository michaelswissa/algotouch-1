
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

// Import our components
import LoadingSkeleton from './subscription/LoadingSkeleton';
import SubscriptionDetails from './subscription/SubscriptionDetails';
import { 
  CriticalErrorState, 
  TimeoutWarningState, 
  MaxRetriesState,
  NoSubscriptionState,
  UnprocessedPaymentState
} from './subscription/ErrorStates';

const UserSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscriptionContext();
  const { 
    subscription, 
    loading, 
    details, 
    error,
    refreshSubscription, 
    checkForUnprocessedPayments 
  } = useSubscription();
  const [activeTab, setActiveTab] = useState('details');
  const [hasUnprocessedPayment, setHasUnprocessedPayment] = useState(false);
  const [specificLowProfileId, setSpecificLowProfileId] = useState('');
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetriesReached, setMaxRetriesReached] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [criticalError, setCriticalError] = useState(false);
  
  // Add timeout safety to prevent infinite loading
  useEffect(() => {
    let timer: number | undefined;
    
    if (loading) {
      // If loading takes more than 10 seconds, show a timeout warning
      timer = window.setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);

      // Add a critical timeout - if loading continues for too long, trigger error state
      const criticalTimer = window.setTimeout(() => {
        setCriticalError(true);
        console.error("Critical timeout reached for subscription loading");
      }, 25000);
      
      return () => {
        if (timer) window.clearTimeout(timer);
        window.clearTimeout(criticalTimer);
      };
    } else {
      // Clear timeouts and reset timeout states when loading is finished
      setLoadingTimeout(false);
      if (timer) window.clearTimeout(timer);
      return undefined;
    }
  }, [loading]);
  
  // Clear registration data on component mount if subscription exists
  useEffect(() => {
    if (!loading && (subscription || hasActiveSubscription)) {
      sessionStorage.removeItem('registration_data');
      console.log('Registration data cleared due to existing subscription');
    }
  }, [loading, subscription, hasActiveSubscription]);
  
  // Check for unprocessed payments when the component mounts or when the user changes
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!user?.id || !user?.email || loading) return;
      
      try {
        setCheckError(null);
        
        // If we already have a subscription or we've retried too many times, skip the check
        if (subscription && retryCount > 0) return;
        
        // Don't check if we've already reached max retries
        if (retryCount >= 3) {
          setMaxRetriesReached(true);
          return;
        }
        
        // Check for unprocessed payments
        const hasUnprocessed = await checkForUnprocessedPayments();
        setHasUnprocessedPayment(hasUnprocessed);
        
        // If there are unprocessed payments and we don't have a subscription yet, try to auto-process them
        if (hasUnprocessed && !subscription) {
          setIsAutoProcessing(true);
          
          try {
            // Process webhook for this user
            const { data, error } = await supabase.functions.invoke('reprocess-webhook-by-email', {
              body: { 
                email: user.email,
                userId: user.id,
                forceRefresh: retryCount > 0 // Add more force on retry
              }
            });
            
            if (error) throw error;
            
            if (data?.success) {
              toast.success('עדכון פרטי המנוי הושלם בהצלחה');
              await refreshSubscription();
            } else {
              console.log('Auto-processing failed:', data?.message);
              setRetryCount(prev => prev + 1);
            }
          } catch (err) {
            console.error('Auto-processing failed:', err);
            setRetryCount(prev => prev + 1);
          } finally {
            setIsAutoProcessing(false);
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        setCheckError('שגיאה בבדיקת סטטוס התשלום');
        setRetryCount(prev => prev + 1);
        
        if (retryCount + 1 >= 3) {
          setMaxRetriesReached(true);
        }
      }
    };
    
    // Clear any leftover registration data to avoid showing "complete registration" message
    if (!loading && user?.id) {
      sessionStorage.removeItem('registration_data');
    }
    
    // Only check payment status if we haven't retried too many times
    if (retryCount < 3) {
      checkPaymentStatus();
    }
    
    // Setup interval only if we haven't reached max retries
    let refreshInterval: number | undefined;
    if (retryCount < 3 && user?.id) {
      refreshInterval = window.setInterval(() => {
        if (user?.id && refreshSubscription) {
          refreshSubscription().catch(console.error);
        }
      }, 60000); // Check every minute
    }
    
    return () => {
      if (refreshInterval) {
        window.clearInterval(refreshInterval);
      }
    };
  }, [user, loading, subscription, checkForUnprocessedPayments, refreshSubscription, retryCount]);

  // Function to manually refresh subscription data
  const handleManualRefresh = async () => {
    if (refreshSubscription) {
      setRetryCount(0); // Reset retry count on manual refresh
      setMaxRetriesReached(false); // Reset max retries flag
      setLoadingTimeout(false); // Reset timeout flag
      setCriticalError(false); // Reset critical error flag
      
      try {
        await refreshSubscription();
        toast.success('הנתונים עודכנו בהצלחה');
        setCheckError(null);
        
        // Check for unprocessed payments again
        if (user?.id && user?.email) {
          const hasUnprocessed = await checkForUnprocessedPayments();
          setHasUnprocessedPayment(hasUnprocessed);
        }
      } catch (err) {
        console.error('Error refreshing subscription:', err);
        toast.error('שגיאה בעדכון הנתונים');
        setCheckError('שגיאה בעדכון הנתונים');
      }
    }
  };
  
  // If critical error occurs, show an emergency fallback view
  if (criticalError) {
    return (
      <CriticalErrorState 
        title="בעיה קריטית בטעינת פרטי המנוי" 
        description="לא ניתן לטעון את נתוני המנוי"
        onRefresh={handleManualRefresh}
        userId={user?.id}
        email={user?.email}
      />
    );
  }

  // Show timeout warning if loading is taking too long
  if (loadingTimeout && loading) {
    return (
      <TimeoutWarningState 
        title="טעינת פרטי המנוי מתעכבת" 
        description="הטעינה נמשכת זמן רב מהצפוי"
        onRefresh={handleManualRefresh}
      />
    );
  }

  // Special state for when we've tried a few times and still can't load data
  if (maxRetriesReached || (checkError && retryCount >= 3)) {
    return (
      <MaxRetriesState 
        title="שגיאה בטעינת פרטי המנוי" 
        description="אירעה שגיאה בטעינת פרטי המנוי"
        onRefresh={handleManualRefresh}
        userId={user?.id}
        email={user?.email}
      >
        {checkError || 'לא ניתן לטעון את פרטי המנוי לאחר מספר ניסיונות'}
      </MaxRetriesState>
    );
  }

  if (loading || isAutoProcessing) {
    return <LoadingSkeleton />;
  }

  // If there's unprocessed payment but no subscription
  if (hasUnprocessedPayment && !subscription && user?.id && user?.email) {
    return (
      <UnprocessedPaymentState
        userId={user.id}
        email={user.email}
        lowProfileId={specificLowProfileId || undefined}
        onComplete={handleManualRefresh}
      />
    );
  }

  // If no subscription data was found
  if (!subscription) {
    return (
      <NoSubscriptionState onSubscribe={() => navigate('/subscription')} />
    );
  }

  // Render subscription details
  return (
    <SubscriptionDetails 
      subscription={subscription}
      details={details}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onRefresh={handleManualRefresh}
    />
  );
};

export default UserSubscription;
