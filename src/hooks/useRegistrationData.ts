
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        const data = JSON.parse(storedData);
        setRegistrationData(data);
        
        // If plan was already selected in a previous session, set it
        if (data.planId) {
          setSelectedPlan(data.planId);
          setCurrentStep(data.lastCompletedStep ? data.lastCompletedStep + 1 : 2);
        }
      }
    } catch (error) {
      console.error('Error parsing registration data:', error);
    }
  }, []);

  const updateRegistrationData = (newData: any) => {
    try {
      const updatedData = {
        ...registrationData,
        ...newData,
        lastUpdated: new Date().toISOString()
      };
      
      setRegistrationData(updatedData);
      sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
      
      // If this is the first time setting registration data, record registration time
      if (!registrationData?.registrationTime) {
        const registrationTimeData = {
          ...updatedData,
          registrationTime: new Date().toISOString()
        };
        setRegistrationData(registrationTimeData);
        sessionStorage.setItem('registration_data', JSON.stringify(registrationTimeData));
      }
    } catch (error) {
      console.error('Error updating registration data:', error);
    }
  };

  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    setRegistrationData(null);
    setCurrentStep(1);
    setSelectedPlan('');
  };

  const completeStep = (step: number) => {
    updateRegistrationData({ lastCompletedStep: step });
    setCurrentStep(step + 1);
  };

  return {
    registrationData,
    updateRegistrationData,
    clearRegistrationData,
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan,
    completeStep
  };
};
