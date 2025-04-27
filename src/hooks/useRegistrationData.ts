
import { useState, useEffect } from 'react';
import { getRegistrationData, storeRegistrationData, RegistrationData } from '@/lib/registration/registration-service';

interface UseRegistrationDataResult {
  registrationData: RegistrationData | null;
  updateRegistrationData: (newData: Partial<RegistrationData>) => void;
  clearRegistrationData: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  selectedPlan: string | undefined;
  setSelectedPlan: (plan: string | undefined) => void;
}

export function useRegistrationData(): UseRegistrationDataResult {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  // Load registration data from session storage on initial load
  useEffect(() => {
    const storedData = getRegistrationData();
    if (Object.keys(storedData).length > 0) {
      setRegistrationData(storedData);
      
      // If plan already selected, update state
      if (storedData.planId) {
        setSelectedPlan(storedData.planId);
      }
      
      // Determine current step based on stored data
      if (storedData.contractSigned) {
        setCurrentStep(3); // Payment step
      } else if (storedData.planId) {
        setCurrentStep(2); // Contract step
      }
    }
  }, []);

  // Update registration data and save to session storage
  const updateRegistrationData = (newData: Partial<RegistrationData>) => {
    setRegistrationData(prevData => {
      const updatedData = { ...prevData, ...newData } as RegistrationData;
      
      // Save to session storage
      storeRegistrationData(updatedData);
      
      return updatedData;
    });
    
    // Update step and plan selection based on new data
    if (newData.contractSigned && currentStep < 3) {
      setCurrentStep(3);
    } else if (newData.planId && currentStep < 2) {
      setCurrentStep(2);
    }
    
    if (newData.planId) {
      setSelectedPlan(newData.planId);
    }
  };

  // Clear registration data
  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    sessionStorage.removeItem('contract_data');
    setRegistrationData(null);
    setCurrentStep(1);
    setSelectedPlan(undefined);
  };

  return {
    registrationData,
    updateRegistrationData,
    clearRegistrationData,
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan
  };
}
