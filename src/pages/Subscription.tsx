
import React from 'react';
import Layout from '@/components/Layout';
import { SubscriptionProvider } from '@/contexts/subscription/SubscriptionContext';
import SubscriptionStepHandler from '@/components/subscription/SubscriptionStepHandler';
import SubscriptionSteps from '@/components/subscription/SubscriptionSteps';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

const SubscriptionContent = () => {
  const { currentStep } = useSubscriptionContext();
  
  // המרת ערך ה-currentStep למספר לצורך הצגה במד ההתקדמות
  const stepNumber = 
    currentStep === 'plan' ? 1 :
    currentStep === 'contract' ? 2 :
    currentStep === 'payment' ? 3 :
    currentStep === 'success' ? 4 : 1;
  
  return (
    <div className="container max-w-4xl mx-auto px-4">
      <SubscriptionSteps currentStep={stepNumber} />
      <SubscriptionStepHandler />
    </div>
  );
};

const Subscription = () => {
  return (
    <Layout className="py-8" hideSidebar={true}>
      <SubscriptionProvider>
        <SubscriptionContent />
      </SubscriptionProvider>
    </Layout>
  );
};

export default Subscription;
