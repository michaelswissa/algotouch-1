
import React, { useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useSubscriptionSteps } from '@/hooks/useSubscriptionSteps';
import { useSubscriptionFlow } from '@/hooks/subscription/useSubscriptionFlow';
import { StorageService } from '@/services/storage/StorageService';
import { validatePlanSelection, validateContractData } from '@/lib/subscription/step-validation';
import SubscriptionLogger from '@/lib/subscription/logging-service';
import SubscriptionSteps from './SubscriptionSteps';
import PlanSelectionStep from './PlanSelectionStep';
import ContractSection from './ContractSection';
import PaymentSection from './PaymentSection';
import SubscriptionSuccess from './SubscriptionSuccess';
import { PaymentProvider } from '@/contexts/payment/PaymentContext';

const SubscriptionStepHandler: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const { user, isAuthenticated, loading } = useAuth();
  const { hasActiveSubscription, isCheckingSubscription } = useSubscriptionContext();
  const location = useLocation();
  const isRegistering = location.state?.isRegistering === true;
  const registrationData = StorageService.getRegistrationData();
  
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
      SubscriptionLogger.logPlanSelection(planId);
    }
    
    // Skip validation during initial loading
    if (loading || isCheckingSubscription) return;
    
    // Validate current step
    if (currentStep === 2 && !validatePlanSelection(selectedPlan)) {
      SubscriptionLogger.logError('Invalid step transition', 'Missing plan selection');
      setCurrentStep(1);
    } else if (currentStep === 3 && !validateContractData()) {
      SubscriptionLogger.logError('Invalid step transition', 'Missing contract data');
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
    SubscriptionLogger.logError('Unauthorized access', 'User already has active subscription');
    return <Navigate to="/my-subscription" replace />;
  }

  if (!isAuthenticated && !StorageService.getRegistrationData() && !isRegistering) {
    return <Navigate to="/auth" state={{ redirectToSubscription: true }} replace />;
  }

  const onPlanSelect = (planId: string) => {
    if (handlePlanSelect(planId)) {
      setSelectedPlan(planId);
      setCurrentStep(2);
      SubscriptionLogger.logPlanSelection(planId);
    }
  };

  const onContractSign = async (contractData: any) => {
    if (await handleContractSign(contractData)) {
      setCurrentStep(3);
      SubscriptionLogger.logContractSigned({ 
        planId: selectedPlan || '', 
        email: contractData.email 
      });
    }
  };

  const onPaymentComplete = async () => {
    if (await handlePaymentComplete()) {
      setCurrentStep(4);
      SubscriptionLogger.logPaymentComplete({ 
        planId: selectedPlan || '', 
        success: true 
      });
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
          fullName={StorageService.getRegistrationData()?.userData?.firstName && StorageService.getRegistrationData()?.userData?.lastName 
            ? `${StorageService.getRegistrationData().userData.firstName} ${StorageService.getRegistrationData().userData.lastName}` 
            : ''}
          onSign={onContractSign}
          onBack={() => setCurrentStep(1)}
        />
      )}
      
      {currentStep === 3 && selectedPlan && (
        <PaymentProvider>
          <PaymentSection
            planId={selectedPlan}
            onPaymentComplete={onPaymentComplete}
            onBack={() => setCurrentStep(2)}
          />
        </PaymentProvider>
      )}
      
      {currentStep === 4 && <SubscriptionSuccess />}
    </>
  );
};

export default SubscriptionStepHandler;
