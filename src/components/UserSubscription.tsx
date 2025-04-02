
import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';

// Import our components
import SubscriptionCard from './subscription/SubscriptionCard';
import SubscriptionStatus from './subscription/SubscriptionStatus';
import BillingInfo from './subscription/BillingInfo';
import PaymentMethodInfo from './subscription/PaymentMethodInfo';
import SubscriptionFooter from './subscription/SubscriptionFooter';
import LoadingSkeleton from './subscription/LoadingSkeleton';

const UserSubscription = () => {
  const { subscription, loading, details } = useSubscription();

  if (loading) {
    return <LoadingSkeleton />;
  }

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
