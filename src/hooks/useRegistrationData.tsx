
import { useState, useEffect } from 'react';

interface RegistrationData {
  email?: string;
  contractSigned?: boolean;
  planId?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  password?: string;
  contractDetails?: {
    contractHtml?: string;
    signature?: string;
    agreedToTerms?: boolean;
    agreedToPrivacy?: boolean;
    contractVersion?: string;
    browserInfo?: any;
  };
  contractSignedAt?: string;
  registrationTime?: string;
}

export const useRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        console.log('Registration data found:', { 
          email: data.email, 
          firstName: data.userData?.firstName,
          registrationTime: data.registrationTime 
        });
        
        setRegistrationData(data);
        
        if (data.contractSigned) {
          setCurrentStep(3);
          setSelectedPlan(data.planId);
        } else if (data.planId) {
          setCurrentStep(2);
          setSelectedPlan(data.planId);
        }
      } catch (error) {
        console.error('Error parsing registration data:', error);
      }
    }
  }, []);

  const updateRegistrationData = (newData: Partial<RegistrationData>) => {
    let updatedData: RegistrationData;
    
    if (registrationData) {
      updatedData = { ...registrationData, ...newData };
    } else {
      updatedData = newData as RegistrationData;
    }
    
    setRegistrationData(updatedData);
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
    
    // Automatically update steps based on data
    if (newData.contractSigned) {
      setCurrentStep(3);
    } else if (newData.planId && currentStep === 1) {
      setCurrentStep(2);
    }
    
    if (newData.planId) {
      setSelectedPlan(newData.planId);
    }
  };

  return {
    registrationData,
    updateRegistrationData,
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan
  };
};
