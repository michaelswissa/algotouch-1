
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';

export type SubscriptionStep = 'plan_selection' | 'contract' | 'payment' | 'success';

interface SubscriptionStepsState {
  currentStep: number;
  selectedPlan: string | undefined;
  setCurrentStep: (step: number) => void;
  setSelectedPlan: (plan: string) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

/**
 * A hook for managing subscription flow steps
 */
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
    }

    // Check if we're coming from registration with state
    const isRegistering = location.state?.isRegistering === true;
    
    // Get registration data if available
    const storedData = sessionStorage.getItem('registration_data');
    
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        
        // Determine current step based on stored data
        if (data.contractSigned) {
          setCurrentStep(3); // Payment step
        } else if (data.planId) {
          setCurrentStep(2); // Contract step
        }
        
        // Set selected plan if it exists in stored data
        if (data.planId && !selectedPlan) {
          setSelectedPlan(data.planId);
        }
      } catch (e) {
        console.error('Error parsing registration data:', e);
      }
    }
  }, [planId, selectedPlan, location.state]);

  const goToNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
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
