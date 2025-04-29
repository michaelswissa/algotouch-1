
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
    fullName
  } = useSubscriptionContext();

  const renderStep = useCallback(() => {
    if (loading) {
      return <LoadingSkeleton />;
    }

    switch (currentStep) {
      case 'plan':
        return <PlanSelectionStep onSelectPlan={handlePlanSelected} selectedPlanId={selectedPlan || undefined} />;
      case 'contract':
        return <ContractSection 
          selectedPlan={selectedPlan || 'monthly'} 
          fullName={fullName} 
          onSign={(data) => handleContractSigned(true)} 
          onBack={() => handlePlanSelected(null)} 
        />;
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
        return <PlanSelectionStep onSelectPlan={handlePlanSelected} selectedPlanId={selectedPlan || undefined} />;
    }
  }, [currentStep, selectedPlan, handlePlanSelected, handleContractSigned, handlePaymentComplete, loading, fullName]);

  return <>{renderStep()}</>;
};

export default SubscriptionStepHandler;
