
import React from 'react';
import { Steps, Step } from '@/components/subscription/Steps';
import { Steps as StepType } from '@/types/subscription';

interface SubscriptionStepsProps {
  currentStep: StepType;
}

const SubscriptionSteps: React.FC<SubscriptionStepsProps> = ({ currentStep }) => {
  // Convert string step to number for the Steps component
  const stepMapping: Record<StepType, number> = {
    'plan-selection': 1,
    'contract': 2,
    'payment': 3,
    'completion': 4
  };

  return (
    <Steps currentStep={stepMapping[currentStep]} className="mt-8">
      <Step title="בחירת תכנית" />
      <Step title="חתימה על הסכם" />
      <Step title="פרטי תשלום" />
      <Step title="אישור" />
    </Steps>
  );
};

export default SubscriptionSteps;
