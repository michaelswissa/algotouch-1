
import React from 'react';
import { Steps, Step } from '@/components/subscription/Steps';

interface SubscriptionStepsProps {
  currentStep: string | number;
}

const stepMap: { [key: string]: number } = {
  'plan_selection': 0,
  'contract': 1,
  'payment': 2,
  'success': 3
};

const SubscriptionSteps: React.FC<SubscriptionStepsProps> = ({ currentStep }) => {
  // Convert string step to number, default to 0 if not found
  const stepNumber = typeof currentStep === 'string' 
    ? (stepMap[currentStep] ?? 0) 
    : currentStep;

  return (
    <Steps currentStep={stepNumber} className="mt-8">
      <Step title="בחירת תכנית" />
      <Step title="חתימה על הסכם" />
      <Step title="פרטי תשלום" />
      <Step title="אישור" />
    </Steps>
  );
};

export default SubscriptionSteps;
