
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
    loading,
    fullName,
    email
  } = useSubscriptionContext();

  const renderStep = useCallback(() => {
    if (loading) {
      return <LoadingSkeleton />;
    }

    switch (currentStep) {
      case 'plan':
        return <PlanSelectionStep onSelectPlan={handlePlanSelected} selectedPlanId={selectedPlan} />;
      case 'contract':
        return (
          <ContractSection 
            onBack={() => handlePlanSelected(null)} 
            selectedPlan={selectedPlan || 'monthly'}
            fullName={fullName}
            onSign={() => handleContractSigned(true)}
          />
        );
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
        return <PlanSelectionStep onSelectPlan={handlePlanSelected} selectedPlanId={selectedPlan} />;
    }
  }, [currentStep, selectedPlan, handlePlanSelected, handleContractSigned, handlePaymentComplete, loading, fullName]);

  return <>{renderStep()}</>;
};

export default SubscriptionStepHandler;
