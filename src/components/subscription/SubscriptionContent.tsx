
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import SubscriptionSteps from '@/components/subscription/SubscriptionSteps';
import { useSubscriptionFlow } from './hooks/useSubscriptionFlow';
import SubscriptionView from './views/SubscriptionView';

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
    isAuthenticated
  } = useSubscriptionFlow();

  // Validate the current flow when component loads
  useEffect(() => {
    // Check URL parameters for plan selection
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    
    // If we have a plan parameter but no selected plan, use it
    if (planParam && !selectedPlan && currentStep === 'plan-selection') {
      handlePlanSelect(planParam);
    }
    
    // Make sure the step sequence is valid
    if (currentStep === 'payment' && !selectedPlan) {
      console.log('Invalid flow state: payment step without selected plan, redirecting to plan selection');
      handleBackToStep('plan-selection');
    } else if (currentStep === 'contract' && !selectedPlan) {
      console.log('Invalid flow state: contract step without selected plan, redirecting to plan selection');
      handleBackToStep('plan-selection');
    }
  }, [currentStep, selectedPlan]);

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
