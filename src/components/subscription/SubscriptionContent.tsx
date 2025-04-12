
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import StepHeader from './StepHeader';
import PlanSelection from './PlanSelection';
import ContractAgreement from './ContractAgreement';
import PaymentSection from './PaymentSection';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';

// Steps for the subscription process
enum SubscriptionStep {
  PlanSelection = 'plan-selection',
  ContractAgreement = 'contract-agreement',
  Payment = 'payment',
  Confirmation = 'confirmation'
}

const SubscriptionContent = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<SubscriptionStep>(SubscriptionStep.PlanSelection);
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [contractAccepted, setContractAccepted] = useState(false);
  const { hasActiveSubscription, checkUserSubscription } = useSubscriptionContext();
  const { isChecking, paymentSuccess } = usePaymentStatus();

  // Check for payment status in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    
    // Allow URL-based step navigation
    if (step === 'payment' && selectedPlan) {
      setCurrentStep(SubscriptionStep.Payment);
    } else if (step === 'contract' && selectedPlan) {
      setCurrentStep(SubscriptionStep.ContractAgreement);
    }
    
    setIsCheckingRegistration(false);
  }, [selectedPlan]);

  // Check for existing subscription if user is authenticated
  useEffect(() => {
    if (user?.id) {
      checkUserSubscription(user.id);
    }
  }, [user, checkUserSubscription]);

  // Handle existing subscription detection
  useEffect(() => {
    if (hasActiveSubscription) {
      navigate('/my-subscription');
    }
  }, [hasActiveSubscription, navigate]);

  const handlePlanSelected = (plan: string) => {
    setSelectedPlan(plan);
    setCurrentStep(SubscriptionStep.ContractAgreement);
  };

  const handleContractAccepted = (accepted: boolean) => {
    setContractAccepted(accepted);
    if (accepted) {
      setCurrentStep(SubscriptionStep.Payment);
    }
  };

  const handlePaymentComplete = () => {
    setCurrentStep(SubscriptionStep.Confirmation);
    
    // After successful payment, redirect to the app
    setTimeout(() => {
      navigate('/my-subscription');
    }, 2000);
  };

  const handleBackFromContract = () => {
    setCurrentStep(SubscriptionStep.PlanSelection);
  };

  const handleBackFromPayment = () => {
    setCurrentStep(SubscriptionStep.ContractAgreement);
  };

  // Show loading state
  if (isCheckingRegistration || isChecking) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show payment success message
  if (paymentSuccess) {
    return (
      <div className="max-w-lg mx-auto text-center p-8 bg-green-50 rounded-lg border border-green-200">
        <div className="text-green-500 mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-green-700 mb-2">התשלום התקבל בהצלחה!</h3>
        <p className="text-green-600">מעבר לדף המנוי שלך...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <StepHeader 
        currentStep={currentStep} 
        steps={[
          { id: SubscriptionStep.PlanSelection, label: 'בחירת תכנית' },
          { id: SubscriptionStep.ContractAgreement, label: 'הסכם' },
          { id: SubscriptionStep.Payment, label: 'תשלום' },
          { id: SubscriptionStep.Confirmation, label: 'אישור' }
        ]}
      />
      
      <div className="mt-8">
        {currentStep === SubscriptionStep.PlanSelection && (
          <PlanSelection onPlanSelected={handlePlanSelected} />
        )}
        
        {currentStep === SubscriptionStep.ContractAgreement && (
          <ContractAgreement 
            plan={selectedPlan} 
            onAccept={handleContractAccepted}
            onBack={handleBackFromContract}
          />
        )}
        
        {currentStep === SubscriptionStep.Payment && (
          <PaymentSection 
            selectedPlan={selectedPlan}
            onPaymentComplete={handlePaymentComplete}
            onBack={handleBackFromPayment}
          />
        )}
        
        {currentStep === SubscriptionStep.Confirmation && (
          <div className="text-center p-8">
            <div className="text-green-500 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">תודה על הצטרפותך!</h3>
            <p>המנוי שלך הופעל בהצלחה.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionContent;
