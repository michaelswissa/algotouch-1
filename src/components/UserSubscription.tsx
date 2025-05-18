import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

// Import our components
import SubscriptionCard from './subscription/SubscriptionCard';
import SubscriptionStatus from './subscription/SubscriptionStatus';
import BillingInfo from './subscription/BillingInfo';
import PaymentMethodInfo from './subscription/PaymentMethodInfo';
import SubscriptionFooter from './subscription/SubscriptionFooter';
import LoadingSkeleton from './subscription/LoadingSkeleton';
import ContractViewer from './subscription/ContractViewer';
import DocumentsList from './subscription/DocumentsList';
import SubscriptionManager from './payment/SubscriptionManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

// Types for webhook checking functions
interface WebhookCheckResult {
  hasUnprocessedPayment: boolean;
  specificLowProfileId: string;
}

const UserSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscriptionContext(); // Use the computed property
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
      <SubscriptionCard 
        title="בעיה קריטית בטעינת פרטי המנוי" 
        description="לא ניתן לטעון את נתוני המנוי"
      >
        <div className="p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              קיימת בעיה בטעינת פרטי המנוי. ייתכן שהנתונים בבסיס הנתונים חסרים או שגויים.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={handleManualRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              נסה שוב
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate('/subscription')}
            >
              עבור לדף המנויים
            </Button>
          </div>
          
          {user?.email && (
            <div className="mt-6 p-4 border border-yellow-500 bg-yellow-50 rounded-md">
              <h3 className="font-medium mb-2">כלי תיקון:</h3>
              <p className="mb-4 text-sm">לתיקון בעיות במנוי, ניתן להשתמש בכלי התיקון:</p>
              <SubscriptionManager 
                userId={user.id} 
                email={user.email} 
                onComplete={handleManualRefresh}
              />
            </div>
          )}
        </div>
      </SubscriptionCard>
    );
  }

  // Show timeout warning if loading is taking too long
  if (loadingTimeout && loading) {
    return (
      <SubscriptionCard 
        title="טעינת פרטי המנוי מתעכבת" 
        description="הטעינה נמשכת זמן רב מהצפוי"
      >
        <div className="p-6">
          <Alert className="mb-4">
            <AlertDescription>
              טעינת פרטי המנוי נמשכת זמן רב מהצפוי. ייתכן שישנה בעיה בתקשורת עם השרת.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={handleManualRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              רענן נתונים
            </Button>
          </div>
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>אם הבעיה נמשכת, ייתכן שנתוני המנוי חסרים במערכת.</p>
          </div>
        </div>
      </SubscriptionCard>
    );
  }

  // Special state for when we've tried a few times and still can't load data
  if (maxRetriesReached || (checkError && retryCount >= 3)) {
    return (
      <SubscriptionCard 
        title="שגיאה בטעינת פרטי המנוי" 
        description="אירעה שגיאה בטעינת פרטי המנוי"
      >
        <div className="p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {checkError || 'לא ניתן לטעון את פרטי המנוי לאחר מספר ניסיונות'}
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={handleManualRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              נסה שוב
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate('/subscription')}
            >
              עבור לדף המנויים
            </Button>
          </div>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>אם הבעיה נמשכת, אנא נסה להתחבר מחדש או צור קשר עם התמיכה</p>
            
            {user?.email && (
              <div className="mt-4">
                <SubscriptionManager 
                  userId={user.id} 
                  email={user.email} 
                  onComplete={handleManualRefresh}
                />
              </div>
            )}
          </div>
        </div>
      </SubscriptionCard>
    );
  }

  if (loading || isAutoProcessing) {
    return <LoadingSkeleton />;
  }

  // If there's unprocessed payment but no subscription
  if (hasUnprocessedPayment && !subscription && user?.email) {
    return (
      <SubscriptionCard 
        title="עדכון פרטי מנוי" 
        description="נראה שביצעת תשלום שלא הושלם לגמרי במערכת"
      >
        <SubscriptionManager 
          userId={user.id} 
          email={user.email} 
          lowProfileId={specificLowProfileId || undefined} 
          onComplete={handleManualRefresh}
        />
      </SubscriptionCard>
    );
  }

  // If no subscription data was found
  if (!subscription) {
    return (
      <SubscriptionCard 
        title="אין לך מנוי פעיל" 
        description="הרשם עכשיו כדי לקבל גישה מלאה למערכת"
      >
        <div className="text-center py-6">
          <Button 
            onClick={() => navigate('/subscription')}
            className="mx-auto"
          >
            בחר תכנית מנוי
          </Button>
        </div>
      </SubscriptionCard>
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

// Extract subscription details view to a separate component
const SubscriptionDetails = ({ 
  subscription, 
  details, 
  activeTab, 
  setActiveTab,
  onRefresh 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasTrial = subscription.status === 'trial' || subscription.plan_type === 'monthly';
  const hasContract = subscription.contract_signed;
  const isCancelled = subscription.status === 'cancelled';
  const billingError = !details?.nextBillingDate && subscription.status === 'active';
  
  // Create fallback details if details object is missing
  const fallbackDetails = details || {
    planName: subscription.plan_type === 'annual' ? 'שנתי' : 
              subscription.plan_type === 'vip' ? 'VIP' : 'חודשי',
    statusText: subscription.status || 'לא ידוע',
    nextBillingDate: 'לא זמין',
    planPrice: subscription.plan_type === 'annual' ? '899' : 
               subscription.plan_type === 'vip' ? '1499' : '99',
    daysLeft: 0,
    progressValue: 0,
    paymentMethod: null
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.success('נתוני המנוי עודכנו');
    } catch (error) {
      toast.error('שגיאה בעדכון נתוני המנוי');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SubscriptionCard
      title={`מנוי ${fallbackDetails.planName}${isCancelled ? ' (מבוטל)' : ''}`}
      description={`סטטוס: ${fallbackDetails.statusText}`}
    >
      <>
        <div className="flex justify-end mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="text-xs flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>רענן נתונים</span>
          </Button>
        </div>
      
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="my-2 w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details">פרטי מנוי</TabsTrigger>
            <TabsTrigger value="contract">הסכם</TabsTrigger>
            <TabsTrigger value="documents">מסמכים</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            {/* If subscription is cancelled, show a notice */}
            {isCancelled && (
              <Alert variant="warning" className="mb-4">
                <AlertDescription>
                  המנוי שלך בוטל ויישאר פעיל עד {fallbackDetails.nextBillingDate}.
                  לאחר מכן, לא תחויב יותר והגישה למערכת תיחסם.
                </AlertDescription>
              </Alert>
            )}
            
            {subscription.status === 'trial' && fallbackDetails && (
              <SubscriptionStatus 
                status={subscription.status} 
                daysLeft={fallbackDetails.daysLeft} 
                progressValue={fallbackDetails.progressValue} 
              />
            )}
            
            <div className="grid grid-cols-1 gap-4 mt-4">
              <BillingInfo 
                nextBillingDate={fallbackDetails.nextBillingDate} 
                planPrice={fallbackDetails.planPrice}
                currency="$"
                hasError={billingError}
              />
              
              <PaymentMethodInfo 
                paymentMethod={fallbackDetails.paymentMethod} 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="contract" className="mt-4">
            {hasContract ? (
              <ContractViewer />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">לא נמצא הסכם חתום</p>
                <Button 
                  onClick={() => window.location.href = '/subscription'}
                  variant="outline"
                >
                  השלם את תהליך ההרשמה
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {subscription && (
              <DocumentsList userId={subscription.id} />
            )}
          </TabsContent>
        </Tabs>
      </>
      <SubscriptionFooter 
        planType={subscription.plan_type} 
        endDate={subscription.current_period_ends_at}
        isCancelled={isCancelled}
      />
    </SubscriptionCard>
  );
};

export default UserSubscription;
