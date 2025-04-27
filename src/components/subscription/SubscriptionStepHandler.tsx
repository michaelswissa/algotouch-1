
import React, { useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useSubscriptionSteps } from '@/hooks/useSubscriptionSteps';
import { useSubscriptionFlow } from '@/hooks/subscription/useSubscriptionFlow';
import { getRegistrationData } from '@/lib/registration/registration-service';
import { validatePlanSelection, validateContractData } from '@/lib/subscription/step-validation';
import SubscriptionSteps from './SubscriptionSteps';
import PlanSelectionStep from './PlanSelectionStep';
import ContractSection from './ContractSection';
import PaymentSection from './PaymentSection';
import SubscriptionSuccess from './SubscriptionSuccess';

const SubscriptionStepHandler: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const { user, isAuthenticated, loading } = useAuth();
  const { hasActiveSubscription, isCheckingSubscription } = useSubscriptionContext();
  const location = useLocation();
  const isRegistering = location.state?.isRegistering === true;
  const registrationData = getRegistrationData();
  
  const {
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan
  } = useSubscriptionSteps();

  const {
    isProcessing,
    handlePlanSelect,
    handleContractSign,
    handlePaymentComplete
  } = useSubscriptionFlow();

  // Initialize steps and check subscription status
  useEffect(() => {
    if (planId && !selectedPlan) {
      setSelectedPlan(planId);
    }
    
    // Skip validation during initial loading
    if (loading || isCheckingSubscription) return;
    
    // Validate current step
    if (currentStep === 2 && !validatePlanSelection(selectedPlan)) {
      setCurrentStep(1);
    } else if (currentStep === 3 && !validateContractData()) {
      setCurrentStep(2);
    }
  }, [planId, selectedPlan, currentStep, loading, isCheckingSubscription]);

  // Show loading state
  if (loading || isCheckingSubscription) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-t-primary animate-spin"></div>
      </div>
    );
  }

  // Handle redirects
  if (isAuthenticated && hasActiveSubscription) {
    return <Navigate to="/my-subscription" replace />;
  }

  if (!isAuthenticated && !registrationData && !isRegistering) {
    return <Navigate to="/auth" state={{ redirectToSubscription: true }} replace />;
  }

  const onPlanSelect = (planId: string) => {
    if (handlePlanSelect(planId)) {
      setSelectedPlan(planId);
      setCurrentStep(2);
    }
  };

  const onContractSign = async (contractData: any) => {
    if (await handleContractSign(contractData)) {
      setCurrentStep(3);
    }
  };

  const onPaymentComplete = async () => {
    if (await handlePaymentComplete()) {
      setCurrentStep(4);
    }
  };

  return (
    <>
      <SubscriptionSteps currentStep={currentStep} />
      
      {currentStep === 1 && (
        <PlanSelectionStep
          selectedPlanId={selectedPlan}
          onSelectPlan={onPlanSelect}
        />
      )}
      
      {currentStep === 2 && selectedPlan && (
        <ContractSection
          selectedPlan={selectedPlan}
          fullName={registrationData?.userData?.firstName && registrationData?.userData?.lastName 
            ? `${registrationData.userData.firstName} ${registrationData.userData.lastName}` 
            : ''}
          onSign={onContractSign}
          onBack={() => setCurrentStep(1)}
        />
      )}
      
      {currentStep === 3 && selectedPlan && (
        <PaymentSection
          planId={selectedPlan}
          onPaymentComplete={onPaymentComplete}
          onBack={() => setCurrentStep(2)}
        />
      )}
      
      {currentStep === 4 && <SubscriptionSuccess />}
    </>
  );
};

export default SubscriptionStepHandler;
