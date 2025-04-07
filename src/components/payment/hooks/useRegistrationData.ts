
import { useState } from 'react';
import { RegistrationData } from '@/types/payment';

export const useRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const loadRegistrationData = () => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setRegistrationData(parsedData);
        console.log("Loaded registration data:", {
          email: parsedData.email,
          hasPassword: !!parsedData.password,
          hasUserData: !!parsedData.userData,
          planId: parsedData.planId,
          hasPaymentToken: !!parsedData.paymentToken
        });
        
        return true;
      } catch (e) {
        console.error("Error parsing registration data:", e);
        setRegistrationError('שגיאה בטעינת פרטי הרשמה. אנא נסה מחדש.');
        return false;
      }
    } else {
      console.log("No registration data found but that's okay - user can pay first and register later");
      return true;
    }
  };

  const updateRegistrationData = (newData: Partial<RegistrationData>) => {
    if (!registrationData) return;
    
    const updatedData = {
      ...registrationData,
      ...newData
    };
    
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
    setRegistrationData(updatedData);
  };

  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    setRegistrationData(null);
  };

  return {
    registrationData,
    registrationError,
    loadRegistrationData,
    updateRegistrationData,
    clearRegistrationData,
    setRegistrationError
  };
};
