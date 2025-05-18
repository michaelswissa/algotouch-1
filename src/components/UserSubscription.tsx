
import React from 'react';
import { useAuth } from '@/contexts/auth';
import { useSubscription } from '@/hooks/useSubscription';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useSubscriptionStatus } from '@/hooks/subscription/useSubscriptionStatus';

// Import our components
import SubscriptionErrorView from './subscription/views/SubscriptionErrorView';
import SubscriptionMainView from './subscription/views/SubscriptionMainView';

const UserSubscription = () => {
  const { user } = useAuth();
  const { details } = useSubscription();
  const statusState = useSubscriptionStatus();
  const { subscription, isLoading } = statusState;

  // Check if we need to show any error states
  const shouldShowErrorView = 
    statusState.criticalError || 
    (statusState.loadingTimeout && statusState.subscriptionLoading) ||
    statusState.maxRetriesReached || 
    (statusState.checkError && statusState.retryCount >= 3) ||
    isLoading ||
    (statusState.hasUnprocessedPayment && !subscription && user?.id) ||
    !subscription;

  if (shouldShowErrorView) {
    return <SubscriptionErrorView statusState={statusState} user={user} />;
  }

  // Render subscription details
  return (
    <SubscriptionMainView 
      subscription={subscription}
      details={details}
      refreshSubscription={statusState.handleRefresh}
    />
  );
};

export default UserSubscription;
