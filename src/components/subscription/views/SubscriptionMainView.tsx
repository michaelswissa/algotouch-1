
import React, { useState } from 'react';
import SubscriptionDetails from '../SubscriptionDetails';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

interface SubscriptionMainViewProps {
  subscription: any;
  details: any;
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
