
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import SubscriptionSteps from '@/components/subscription/SubscriptionSteps';
import { useSubscriptionFlow } from './hooks/useSubscriptionFlow';
import SubscriptionView from './views/SubscriptionView';
import { toast } from 'sonner';

const SubscriptionContent = () => {
  const {
    currentStep,
    selectedPlan,
    fullName,
    isLoading,
    hasActiveSubscription,
    handlePlanSelect,
    handleContractSign,
    handlePaymentComplete,
    handleBackToStep,
    isAuthenticated,
    contractId
  } = useSubscriptionFlow();

  // Clear registration data if the user already has an active subscription
  useEffect(() => {
    if (hasActiveSubscription) {
      // Clear registration data to prevent showing "complete registration" message
      sessionStorage.removeItem('registration_data');
      toast.info('כבר יש לך מנוי פעיל');
    }
  }, [hasActiveSubscription]);

  // Additional validation every time the step changes
  useEffect(() => {
    console.log(`Current step changed to: ${currentStep}`, {
      selectedPlan,
      contractId,
      isAuthenticated
    });
    
    // Strict validation to ensure steps are followed in sequence
    if (currentStep === 'payment' && !selectedPlan) {
      console.error('Invalid flow state: payment step without selected plan, redirecting to plan selection');
      handleBackToStep('plan-selection');
    } else if (currentStep === 'payment' && !contractId) {
      console.error('Invalid flow state: payment step without signed contract, redirecting to contract step');
      handleBackToStep('contract');
    } else if (currentStep === 'contract' && !selectedPlan) {
      console.error('Invalid flow state: contract step without selected plan, redirecting to plan selection');
      handleBackToStep('plan-selection');
    }
    
  }, [currentStep, selectedPlan, contractId, isAuthenticated, handleBackToStep]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-t-primary animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated && hasActiveSubscription) {
    console.log('User has active subscription, redirecting to my-subscription page');
    return <Navigate to="/my-subscription" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">השלמת תהליך ההרשמה</h1>
        <p className="text-muted-foreground">יש להשלים את השלבים הבאים לקבלת גישה למערכת</p>
        
        <SubscriptionSteps currentStep={currentStep} />
      </div>
      
      <SubscriptionView
        currentStep={currentStep}
        selectedPlan={selectedPlan}
        fullName={fullName}
        onPlanSelect={handlePlanSelect}
        onContractSign={handleContractSign}
        onPaymentComplete={handlePaymentComplete}
        onBack={handleBackToStep}
      />
    </div>
  );
};

export default SubscriptionContent;
