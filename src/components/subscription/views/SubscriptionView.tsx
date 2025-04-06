
import React from 'react';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import ContractSection from '@/components/subscription/ContractSection';
import PaymentSection from '@/components/subscription/PaymentSection';
import SubscriptionSuccess from '@/components/subscription/SubscriptionSuccess';
import { SubscriptionPlan } from '@/types/payment';

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
  if (currentStep === 1) {
    return (
      <SubscriptionPlans 
        onSelectPlan={onPlanSelect} 
        selectedPlanId={selectedPlan} 
      />
    );
  }
  
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
  
  if (currentStep === 3 && selectedPlan) {
    return (
      <PaymentSection
        selectedPlan={selectedPlan}
        onPaymentComplete={onPaymentComplete}
        onBack={() => onBack(2)}
      />
    );
  }
  
  if (currentStep === 4) {
    return <SubscriptionSuccess />;
  }
  
  // Default view - shouldn't reach here in normal flow
  return <SubscriptionPlans onSelectPlan={onPlanSelect} selectedPlanId={selectedPlan} />;
};

export default SubscriptionView;
