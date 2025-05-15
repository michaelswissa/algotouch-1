
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

// Types for webhook checking functions
interface WebhookCheckResult {
  hasUnprocessedPayment: boolean;
  specificLowProfileId: string;
}

const UserSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  
  // Clear registration data on component mount if subscription exists
  useEffect(() => {
    if (!loading && subscription) {
      sessionStorage.removeItem('registration_data');
      console.log('Registration data cleared due to existing subscription');
    }
  }, [loading, subscription]);
  
  // Check for unprocessed payments when the component mounts or when the user changes
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!user?.id || !user?.email || loading) return;
      
      try {
        setCheckError(null);
        
        // If we already have a subscription or we've retried too many times, skip the check
        if (subscription && retryCount > 0) return;
        
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
                userId: user.id 
              }
            });
            
            if (error) throw error;
            
            if (data?.success) {
              toast.success('עדכון פרטי המנוי הושלם בהצלחה');
              await refreshSubscription();
            } else {
              console.log('Auto-processing failed:', data?.message);
              setRetryCount(prev => prev + 1);
              // Don't show error message yet, we'll just fallback to manual processing
            }
          } catch (err) {
            console.error('Auto-processing failed:', err);
            setRetryCount(prev => prev + 1);
            // Don't show error message, we'll just fallback to manual processing
          } finally {
            setIsAutoProcessing(false);
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        setCheckError('שגיאה בבדיקת סטטוס התשלום');
        setRetryCount(prev => prev + 1);
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
    
    // Set up periodic refresh of subscription data
    const refreshInterval = setInterval(() => {
      if (user?.id && refreshSubscription && retryCount < 3) {
        refreshSubscription().catch(console.error);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(refreshInterval);
  }, [user, loading, subscription, checkForUnprocessedPayments, refreshSubscription, retryCount]);

  // Function to manually refresh subscription data
  const handleManualRefresh = async () => {
    if (refreshSubscription) {
      setRetryCount(0); // Reset retry count on manual refresh
      try {
        await refreshSubscription();
        toast.success('הנתונים עודכנו בהצלחה');
        setCheckError(null);
      } catch (err) {
        console.error('Error refreshing subscription:', err);
        toast.error('שגיאה בעדכון הנתונים');
        setCheckError('שגיאה בעדכון הנתונים');
      }
    }
  };

  // If we have an error and retried too many times, show an error state to avoid infinite loading
  if (checkError && retryCount >= 3) {
    return (
      <SubscriptionCard 
        title="שגיאה בטעינת פרטי המנוי" 
        description="אירעה שגיאה בטעינת פרטי המנוי"
      >
        <div className="p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {checkError}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleManualRefresh}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            נסה שוב
          </Button>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>אם הבעיה נמשכת, אנא נסה להתחבר מחדש או צור קשר עם התמיכה</p>
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
  return <SubscriptionDetails 
    subscription={subscription}
    details={details}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    onRefresh={handleManualRefresh}
  />;
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
      title={`מנוי ${details?.planName}${isCancelled ? ' (מבוטל)' : ''}`}
      description={`סטטוס: ${details?.statusText}`}
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
                  המנוי שלך בוטל ויישאר פעיל עד {details?.nextBillingDate}.
                  לאחר מכן, לא תחויב יותר והגישה למערכת תיחסם.
                </AlertDescription>
              </Alert>
            )}
            
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
                    currency="$"
                  />
                  
                  <PaymentMethodInfo 
                    paymentMethod={details.paymentMethod} 
                  />
                </>
              )}
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
