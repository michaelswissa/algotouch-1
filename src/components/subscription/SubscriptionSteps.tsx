
import React from 'react';
import { Steps, Step } from '@/components/subscription/Steps';

interface SubscriptionStepsProps {
  currentStep: number;
}

const SubscriptionSteps: React.FC<SubscriptionStepsProps> = ({ currentStep }) => {
  return (
    <Steps currentStep={currentStep} className="mt-8">
      <Step title="בחירת תכנית" />
      <Step title="חתימה על הסכם" />
      <Step title="פרטי תשלום" />
      <Step title="אישור" />
    </Steps>
  );
};

export default SubscriptionSteps;
