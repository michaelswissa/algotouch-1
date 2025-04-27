
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import StorageService from '@/lib/subscription/storage-service';
import SubscriptionLogger from '@/lib/subscription/logging-service';

export type SubscriptionStep = 'plan_selection' | 'contract' | 'payment' | 'success';

interface SubscriptionStepsState {
  currentStep: number;
  selectedPlan: string | undefined;
  setCurrentStep: (step: number) => void;
  setSelectedPlan: (plan: string) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

export function useSubscriptionSteps(): SubscriptionStepsState {
  const { planId } = useParams<{ planId: string }>();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  // Initialize steps based on URL parameters and location state
  useEffect(() => {
    // Check if there's a plan ID in the URL
    if (planId && !selectedPlan) {
      setSelectedPlan(planId);
      SubscriptionLogger.logPlanSelection(planId);
    }

    const registrationData = StorageService.getRegistrationData();
    
    // Determine current step based on stored data
    if (registrationData.contractSigned) {
      setCurrentStep(3); // Payment step
    } else if (registrationData.planId) {
      setCurrentStep(2); // Contract step
    }
    
    // Set selected plan if it exists in stored data
    if (registrationData.planId && !selectedPlan) {
      setSelectedPlan(registrationData.planId);
    }
  }, [planId, selectedPlan, location.state]);

  const goToNextStep = () => {
    const nextStep = Math.min(currentStep + 1, 4);
    SubscriptionLogger.logStepChange(currentStep, nextStep);
    setCurrentStep(nextStep);
  };

  const goToPreviousStep = () => {
    const prevStep = Math.max(currentStep - 1, 1);
    SubscriptionLogger.logStepChange(currentStep, prevStep);
    setCurrentStep(prevStep);
  };

  return {
    currentStep,
    selectedPlan,
    setCurrentStep,
    setSelectedPlan,
    goToNextStep,
    goToPreviousStep
  };
}
