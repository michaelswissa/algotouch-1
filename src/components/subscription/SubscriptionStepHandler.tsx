
import React, { useCallback } from 'react';
import PlanSelectionStep from './PlanSelectionStep';
import ContractSection from './ContractSection';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import IframePaymentStep from './IframePaymentStep';
import SubscriptionSuccess from './SubscriptionSuccess';
import LoadingSkeleton from './LoadingSkeleton';

const SubscriptionStepHandler: React.FC = () => {
  const { 
    currentStep, 
    selectedPlan, 
    handlePlanSelected, 
    handleContractSigned, 
    handlePaymentComplete,
    loading
  } = useSubscriptionContext();

  const renderStep = useCallback(() => {
    if (loading) {
      return <LoadingSkeleton />;
    }

    switch (currentStep) {
      case 'plan':
        return <PlanSelectionStep onPlanSelected={handlePlanSelected} />;
      case 'contract':
        return <ContractSection onContractSigned={handleContractSigned} onBack={() => handlePlanSelected(null)} />;
      case 'payment':
        return (
          <IframePaymentStep 
            planId={selectedPlan || 'monthly'} 
            onPaymentComplete={handlePaymentComplete} 
            onBack={() => handleContractSigned(false)} 
          />
        );
      case 'success':
        return <SubscriptionSuccess />;
      default:
        return <PlanSelectionStep onPlanSelected={handlePlanSelected} />;
    }
  }, [currentStep, selectedPlan, handlePlanSelected, handleContractSigned, handlePaymentComplete, loading]);

  return <>{renderStep()}</>;
};

export default SubscriptionStepHandler;
