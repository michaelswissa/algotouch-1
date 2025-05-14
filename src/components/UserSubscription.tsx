
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase-client';

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

const UserSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, loading, details, refreshSubscription } = useSubscription();
  const [activeTab, setActiveTab] = useState('details');
  const [hasUnprocessedPayment, setHasUnprocessedPayment] = useState(false);
  const [specificLowProfileId, setSpecificLowProfileId] = useState('');
  
  useEffect(() => {
    // Check if there's an unprocessed payment for this user
    const checkPaymentStatus = async () => {
      if (!user?.id || !user?.email) return;
      
      try {
        // Case 1: Check for unprocessed webhooks with tokens - ChargeAndCreateToken with ResponseCode 0
        const { data: tokenWebhooks, error: tokenError } = await supabase
          .from('payment_webhooks')
          .select('*')
          .eq('processed', false)
          .contains('payload', { Operation: 'ChargeAndCreateToken', ResponseCode: '0' })
          .limit(1);
          
        if (tokenError) throw tokenError;
        
        // Case 2: Check for the specific LowProfileId we know has an issue
        const knownLowProfileId = 'd8637470-0bed-4aa6-8ae9-7a68f0058400';
        const { data: specificWebhooks, error: specificError } = await supabase
          .from('payment_webhooks')
          .select('*')
          .eq('processed', false)
          .contains('payload', { LowProfileId: knownLowProfileId })
          .limit(1);
          
        if (specificError) throw specificError;

        // Case 3: Check for unprocessed webhooks that contain the user's email
        // Fix: Use filter() instead of direct string interpolation for the email query
        const { data: emailWebhooks, error: emailError } = await supabase
          .from('payment_webhooks')
          .select('*')
          .eq('processed', false)
          .filter('payload->TranzactionInfo->CardOwnerEmail', 'eq', user.email)
          .limit(1);
          
        if (emailError) {
          console.error('Error checking email webhooks (TranzactionInfo):', emailError);
          // Try alternative path if the first one fails
          const { data: altEmailWebhooks, error: altEmailError } = await supabase
            .from('payment_webhooks')
            .select('*')
            .eq('processed', false)
            .filter('payload->UIValues->CardOwnerEmail', 'eq', user.email)
            .limit(1);
            
          if (altEmailError) {
            console.error('Error checking email webhooks (UIValues):', altEmailError);
          } else if (altEmailWebhooks && altEmailWebhooks.length > 0) {
            setHasUnprocessedPayment(true);
          }
        } else if (emailWebhooks && emailWebhooks.length > 0) {
          setHasUnprocessedPayment(true);
        }
        
        // If any of the checks found an unprocessed webhook, show the subscription manager
        if ((tokenWebhooks && tokenWebhooks.length > 0) || 
            (specificWebhooks && specificWebhooks.length > 0)) {
          
          // Store the LowProfileId if it's the specific one
          if (specificWebhooks && specificWebhooks.length > 0) {
            setSpecificLowProfileId(knownLowProfileId);
          }
          
          setHasUnprocessedPayment(true);
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }
    };
    
    if (!loading && !subscription) {
      checkPaymentStatus();
    }
  }, [user, loading, subscription]);

  // Add a function to manually refresh subscription data
  const handleManualRefresh = async () => {
    if (refreshSubscription) {
      await refreshSubscription();
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Check if user has registration data in progress
  const hasRegistrationInProgress = !!sessionStorage.getItem('registration_data');
  
  if (hasRegistrationInProgress) {
    return (
      <SubscriptionCard 
        title="השלם את תהליך ההרשמה" 
        description="התחלת את תהליך ההרשמה. אנא השלם את התהליך כדי לקבל גישה מלאה."
      >
        <div className="text-center py-6">
          <Button 
            onClick={() => navigate('/subscription')}
            className="mx-auto"
          >
            המשך להרשמה
          </Button>
        </div>
      </SubscriptionCard>
    );
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

  const hasTrial = subscription.status === 'trial' || subscription.plan_type === 'monthly';
  const hasContract = subscription.contract_signed;
  const isCancelled = subscription.status === 'cancelled';

  return (
    <SubscriptionCard
      title={`מנוי ${details?.planName}${isCancelled ? ' (מבוטל)' : ''}`}
      description={`סטטוס: ${details?.statusText}`}
    >
      <>
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="my-2 w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details">פרטי מנוי</TabsTrigger>
            <TabsTrigger value="contract">הסכם</TabsTrigger>
            <TabsTrigger value="documents">מסמכים</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            {/* If subscription is cancelled, show a notice */}
            {isCancelled && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div>
                    <p className="text-sm text-yellow-700">
                      המנוי שלך בוטל ויישאר פעיל עד {details?.nextBillingDate}.
                      לאחר מכן, לא תחויב יותר והגישה למערכת תיחסם.
                    </p>
                  </div>
                </div>
              </div>
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
                  onClick={() => navigate('/subscription')}
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
