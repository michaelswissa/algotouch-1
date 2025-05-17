
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface RegistrationData {
  planId?: string;
  email?: string;
  contractSigned?: boolean;
  contractSignedAt?: string;
  contractDetails?: any;
  userData?: {
    firstName?: string;
    lastName?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export function useRegistrationData() {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load registration data from session storage on initial load
  useEffect(() => {
    try {
      setIsLoading(true);
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setRegistrationData(parsedData);
          
          // If plan already selected, update state
          if (parsedData.planId) {
            setSelectedPlan(parsedData.planId);
          }
          
          // Determine current step based on stored data
          if (parsedData.contractSigned) {
            setCurrentStep(3); // Payment step
          } else if (parsedData.planId) {
            setCurrentStep(2); // Contract step
          }
        } catch (e) {
          logger.error('Error parsing registration data:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update registration data and save to session storage
  const updateRegistrationData = useCallback((newData: Partial<RegistrationData>) => {
    setRegistrationData(prevData => {
      const updatedData = { ...prevData, ...newData } as RegistrationData;
      
      // Save to session storage
      sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
      
      return updatedData;
    });
  }, []);

  // Clear registration data
  const clearRegistrationData = useCallback(() => {
    sessionStorage.removeItem('registration_data');
    setRegistrationData(null);
    setCurrentStep(1);
    setSelectedPlan(undefined);
  }, []);

  // Helper function to update contract signing status
  const updateContractSigning = useCallback((contractDetails: any) => {
    updateRegistrationData({
      contractSigned: true,
      contractSignedAt: new Date().toISOString(),
      contractDetails
    });
    setCurrentStep(3); // Move to payment step
  }, [updateRegistrationData]);

  return {
    registrationData,
    updateRegistrationData,
    clearRegistrationData,
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan,
    isLoading,
    updateContractSigning
  };
}
