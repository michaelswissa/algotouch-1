
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';

// Import our components
import SubscriptionCard from './subscription/SubscriptionCard';
import SubscriptionStatus from './subscription/SubscriptionStatus';
import BillingInfo from './subscription/BillingInfo';
import PaymentMethodInfo from './subscription/PaymentMethodInfo';
import SubscriptionFooter from './subscription/SubscriptionFooter';
import LoadingSkeleton from './subscription/LoadingSkeleton';

const UserSubscription = () => {
  const navigate = useNavigate();
  const { subscription, loading, details } = useSubscription();

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

  const showTrialStatus = subscription.status === 'trial';
  const isPaidPlan = subscription.status === 'active' && subscription.plan_type !== 'vip';
  const isVip = subscription.plan_type === 'vip';
  const isCancelled = subscription.status === 'cancelled';

  return (
    <SubscriptionCard
      title={`מנוי ${details?.planName}`}
      description={`סטטוס: ${details?.statusText}`}
    >
      <>
        {showTrialStatus && details && (
          <SubscriptionStatus 
            status={subscription.status} 
            daysLeft={details.daysLeft} 
            progressValue={details.progressValue} 
          />
        )}
        
        <div className="grid grid-cols-1 gap-4 mt-4">
          {details && (
            <>
              {(isPaidPlan || showTrialStatus || isCancelled) && (
                <BillingInfo 
                  nextBillingDate={details.nextBillingDate} 
                  planPrice={details.planPrice}
                  currency="₪"
                />
              )}
              
              {isVip && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <h3 className="font-medium text-green-700 dark:text-green-300">מנוי VIP לכל החיים</h3>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    רכשת גישה ללא הגבלת זמן למערכת. אין צורך בחיוב נוסף.
                  </p>
                </div>
              )}
              
              {/* Show payment method for all subscription types */}
              <PaymentMethodInfo 
                paymentMethod={details.paymentMethod} 
              />
            </>
          )}
        </div>
        
        <SubscriptionFooter 
          subscriptionId={subscription.id}
          status={subscription.status}
          planType={subscription.plan_type}
        />
      </>
    </SubscriptionCard>
  );
};

export default UserSubscription;
