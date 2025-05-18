
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CriticalErrorState, 
  TimeoutWarningState, 
  MaxRetriesState, 
  NoSubscriptionState, 
  UnprocessedPaymentState 
} from '../error-states';
import LoadingSkeleton from '../LoadingSkeleton';
import { SubscriptionStatusState } from '@/hooks/subscription/types';
import { User } from '@/types/auth';
import SubscriptionManager from '../../payment/SubscriptionManager';

interface SubscriptionErrorViewProps {
  statusState: SubscriptionStatusState;
  user: User | null;
}

const SubscriptionErrorView: React.FC<SubscriptionErrorViewProps> = ({ 
  statusState, 
  user 
}) => {
  const navigate = useNavigate();
  const { 
    criticalError,
    loadingTimeout,
    maxRetriesReached,
    checkError,
    retryCount,
    isLoading,
    hasUnprocessedPayment,
    subscription,
    handleRefresh,
    subscriptionLoading,
    specificLowProfileId
  } = statusState;
  
  // If critical error occurs, show an emergency fallback view
  if (criticalError) {
    return (
      <CriticalErrorState 
        title="בעיה קריטית בטעינת פרטי המנוי" 
        description="לא ניתן לטעון את נתוני המנוי"
        onRefresh={handleRefresh}
        userId={user?.id}
        email={user?.email}
      />
    );
  }

  // Show timeout warning if loading is taking too long
  if (loadingTimeout && statusState.subscriptionLoading) {
    return (
      <TimeoutWarningState 
        title="טעינת פרטי המנוי מתעכבת" 
        description="הטעינה נמשכת זמן רב מהצפוי"
        onRefresh={handleRefresh}
      />
    );
  }

  // Special state for when we've tried a few times and still can't load data
  if (maxRetriesReached || (checkError && retryCount >= 3)) {
    return (
      <MaxRetriesState 
        title="שגיאה בטעינת פרטי המנוי" 
        description="אירעה שגיאה בטעינת פרטי המנוי"
        onRefresh={handleRefresh}
        userId={user?.id}
        email={user?.email}
      >
        {checkError || 'לא ניתן לטעון את פרטי המנוי לאחר מספר ניסיונות'}
      </MaxRetriesState>
    );
  }

  if (isLoading) {
    const canRepair = user?.id && user?.email;
    
    return (
      <>
        <LoadingSkeleton />
        {canRepair && (
          <div className="mt-4">
            <SubscriptionManager
              userId={user.id}
              email={user.email}
              onComplete={handleRefresh}
            />
          </div>
        )}
      </>
    );
  }

  // If there's unprocessed payment but no subscription
  if (hasUnprocessedPayment && !subscription && user?.id && user?.email) {
    return (
      <UnprocessedPaymentState
        userId={user.id}
        email={user.email}
        lowProfileId={statusState.specificLowProfileId || undefined}
        onComplete={handleRefresh}
      />
    );
  }

  // If no subscription data was found
  if (!subscription) {
    return (
      <>
        <NoSubscriptionState onSubscribe={() => navigate('/subscription')} />
        {user?.id && user?.email && (
          <div className="mt-4">
            <SubscriptionManager
              userId={user.id}
              email={user.email}
              onComplete={handleRefresh}
            />
          </div>
        )}
      </>
    );
  }

  return null;
};

export default SubscriptionErrorView;
