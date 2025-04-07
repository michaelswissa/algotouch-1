
import React from 'react';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import ContractSection from '@/components/subscription/ContractSection';
import PaymentSection from '@/components/subscription/payment/PaymentSection';
import SubscriptionSuccess from '@/components/subscription/SubscriptionSuccess';

interface SubscriptionViewProps {
  currentStep: number;
  selectedPlan: string | null;
  fullName: string | null;
  onPlanSelect: (planId: string) => void;
  onContractSign: (contractData: any) => Promise<void>;
  onPaymentComplete: () => void;
  onBack: (step: number) => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  currentStep,
  selectedPlan,
  fullName,
  onPlanSelect,
  onContractSign,
  onPaymentComplete,
  onBack
}) => {
  // Step 1: Plan Selection
  if (currentStep === 1) {
    return (
      <SubscriptionPlans 
        onSelectPlan={onPlanSelect} 
        selectedPlanId={selectedPlan} 
      />
    );
  }
  
  // Step 2: Contract Signing (if applicable)
  if (currentStep === 2 && selectedPlan) {
    return (
      <ContractSection
        selectedPlan={selectedPlan}
        fullName={fullName}
        onSign={onContractSign}
        onBack={() => onBack(1)}
      />
    );
  }
  
  // Step 3: Payment Processing
  if (currentStep === 3 && selectedPlan) {
    return (
      <PaymentSection
        selectedPlan={selectedPlan}
        onPaymentComplete={onPaymentComplete}
        onBack={() => onBack(2)}
      />
    );
  }
  
  // Step 4: Success Page After Completion
  if (currentStep === 4) {
    return <SubscriptionSuccess />;
  }
  
  // Default view - fallback to the first step
  return <SubscriptionPlans onSelectPlan={onPlanSelect} selectedPlanId={selectedPlan} />;
};

export default SubscriptionView;
