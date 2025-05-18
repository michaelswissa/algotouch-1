
import React, { useState } from 'react';
import SubscriptionDetails from '../SubscriptionDetails';
import { Subscription, SubscriptionDetails as SubscriptionDetailsType } from '@/types/subscription';

interface SubscriptionMainViewProps {
  subscription: Subscription | null;
  details: SubscriptionDetailsType | null;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionMainView: React.FC<SubscriptionMainViewProps> = ({ 
  subscription, 
  details,
  refreshSubscription
}) => {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <SubscriptionDetails
      subscription={subscription}
      details={details}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onRefresh={refreshSubscription}
    />
  );
};

export default SubscriptionMainView;
