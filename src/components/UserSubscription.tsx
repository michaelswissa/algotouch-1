
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
  const { hasActiveSubscription } = useSubscriptionContext();
  const { details } = useSubscription();
  const statusState = useSubscriptionStatus();
  const { subscription, isLoading } = statusState;

  // Check if we need to show any error states
  const errorView = (
    <SubscriptionErrorView 
      statusState={statusState} 
      user={user}
    />
  );
  
  // If error view returns non-null, display it instead of main view
  if (errorView.props.statusState.criticalError || 
      (errorView.props.statusState.loadingTimeout && statusState.subscriptionLoading) ||
      errorView.props.statusState.maxRetriesReached || 
      (errorView.props.statusState.checkError && errorView.props.statusState.retryCount >= 3) ||
      isLoading ||
      (errorView.props.statusState.hasUnprocessedPayment && !subscription && user?.id) ||
      !subscription) {
    return errorView;
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
