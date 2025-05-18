
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { RegistrationData } from '@/types/payment';

/**
 * Unified hook for managing registration data across the application
 * Handles both authenticated and unauthenticated registration flows
 */
export const useUnifiedRegistrationData = () => {
  // Get registration data and functions from auth context
  const { 
    registrationData: contextRegistrationData, 
    setRegistrationData: updateContextRegistrationData,
    clearRegistrationData: clearContextRegistrationData,
    isRegistering,
    pendingSubscription,
    setPendingSubscription,
    user
  } = useAuth();
  
  // Local state for registration data
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(
    contextRegistrationData as RegistrationData | null
  );
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'context' | 'session' | 'none'>('none');

  // On component mount, try to load registration data from context or session storage
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);

      try {
        // First try to load from auth context
        if (contextRegistrationData) {
          console.log("Loading registration data from context:", {
            email: contextRegistrationData.email,
            hasUserData: !!contextRegistrationData.userData,
            planId: contextRegistrationData.planId
          });
          
          setRegistrationData(contextRegistrationData as RegistrationData);
          
          // Set current step based on data
          if (contextRegistrationData.paymentToken?.token) {
            setCurrentStep(4); // Payment completed
            setSelectedPlan(contextRegistrationData.planId);
          } else if (contextRegistrationData.contractSigned) {
            setCurrentStep(3); // Ready for payment
            setSelectedPlan(contextRegistrationData.planId);
          } else if (contextRegistrationData.planId) {
            setCurrentStep(2); // Ready for contract
            setSelectedPlan(contextRegistrationData.planId);
          }
          
          setDataSource('context');
          setIsLoading(false);
          return;
        }
        
        // If not in context, try to load from session storage
        const storedData = sessionStorage.getItem('registration_data');
        if (storedData) {
          try {
            const data = JSON.parse(storedData);
            
            // Check if the data is still valid (within 30 minutes)
            const registrationTime = data.registrationTime ? new Date(data.registrationTime) : null;
            const now = new Date();
            const isValid = registrationTime && 
              ((now.getTime() - registrationTime.getTime()) < 30 * 60 * 1000);
            
            // If data is too old, ignore it
            if (!registrationTime || !isValid) {
              console.log('Registration data has expired, clearing session');
              sessionStorage.removeItem('registration_data');
              setDataSource('none');
              setIsLoading(false);
              return;
            }
            
            console.log('Registration data found in session:', { 
              email: data.email, 
              firstName: data.userData?.firstName,
              registrationTime: data.registrationTime,
              hasPaymentToken: !!data.paymentToken,
              age: registrationTime ? Math.round((now.getTime() - registrationTime.getTime()) / 60000) + ' minutes' : 'unknown'
            });
            
            setRegistrationData(data);
            
            // Determine the current step based on stored registration data
            if (data.paymentToken?.token) {
              setCurrentStep(4); // Payment completed
              setSelectedPlan(data.planId);
            } else if (data.contractSigned) {
              setCurrentStep(3); // Ready for payment
              setSelectedPlan(data.planId);
            } else if (data.planId) {
              setCurrentStep(2); // Ready for contract
              setSelectedPlan(data.planId);
            }
            
            // Update the auth context with the session data
            // This helps maintain a single source of truth
            if (updateContextRegistrationData && !contextRegistrationData) {
              updateContextRegistrationData(data);
              setPendingSubscription(true);
            }
            
            setDataSource('session');
          } catch (error) {
            console.error('Error parsing registration data:', error);
            sessionStorage.removeItem('registration_data');
            setDataSource('none');
          }
        } else {
          console.log("No registration data found");
          setDataSource('none');
        }
      } catch (error) {
        console.error("Error loading registration data:", error);
        setRegistrationError("שגיאה בטעינת נתוני הרשמה");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [contextRegistrationData, updateContextRegistrationData, setPendingSubscription]);

  // Update registration data in both state and storage
  const updateRegistrationData = (newData: Partial<RegistrationData>) => {
    try {
      // Start with either the current data or an empty object
      const updatedData: RegistrationData = {
        ...(registrationData || {} as RegistrationData),
        ...newData,
        // Always refresh the timestamp when updating data
        registrationTime: newData.registrationTime || new Date().toISOString()
      } as RegistrationData;
      
      // Update local state
      setRegistrationData(updatedData);
      
      // Save to session storage for persistence
      sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
      
      // Update auth context if available
      if (updateContextRegistrationData) {
        updateContextRegistrationData(updatedData);
        setPendingSubscription(true);
      }
      
      // Automatically update steps based on data
      if (newData.paymentToken?.token) {
        setCurrentStep(4);
      } else if (newData.contractSigned) {
        setCurrentStep(3);
      } else if (newData.planId && currentStep === 1) {
        setCurrentStep(2);
      }
      
      if (newData.planId) {
        setSelectedPlan(newData.planId);
      }
      
      console.log("Updated registration data:", {
        email: updatedData.email,
        plan: updatedData.planId,
        step: updatedData.contractSigned ? "contract signed" : updatedData.planId ? "plan selected" : "initial",
        hasToken: !!updatedData.paymentToken?.token
      });
      
      setDataSource(updateContextRegistrationData ? 'context' : 'session');
      
      return true;
    } catch (error) {
      console.error("Error updating registration data:", error);
      toast.error("שגיאה בשמירת נתוני הרשמה");
      return false;
    }
  };

  // Set payment token data in the registration data
  const setPaymentToken = (tokenData: {
    token: string;
    expiry?: string;
    last4Digits?: string;
    cardholderName?: string;
  }) => {
    return updateRegistrationData({
      paymentToken: tokenData,
      // Update contract signed status if needed
      contractSigned: registrationData?.contractSigned || false
    });
  };

  // Clear all registration data from state and storage
  const clearRegistrationData = () => {
    try {
      // Clear from session storage
      sessionStorage.removeItem('registration_data');
      localStorage.removeItem('temp_registration_id');
      
      // Clear from local state
      setRegistrationData(null);
      setCurrentStep(1);
      setSelectedPlan(undefined);
      
      // Clear from auth context if available
      if (clearContextRegistrationData) {
        clearContextRegistrationData();
      }
      
      console.log("Cleared all registration data");
      setDataSource('none');
      
      return true;
    } catch (error) {
      console.error("Error clearing registration data:", error);
      return false;
    }
  };

  // Check if the registration data is complete enough to proceed to the next step
  const validateStep = (step: number): boolean => {
    if (!registrationData) return false;
    
    switch (step) {
      case 1: // Plan selection
        return !!registrationData.planId;
      case 2: // Contract step
        return !!registrationData.planId && 
               !!registrationData.email && 
               !!registrationData.userData?.firstName &&
               !!registrationData.userData?.lastName;
      case 3: // Payment step
        return !!registrationData.contractSigned && 
               !!registrationData.planId;
      case 4: // Completion
        return !!registrationData.paymentToken?.token;
      default:
        return false;
    }
  };

  return {
    registrationData,
    registrationError,
    isRegistering: isRegistering || dataSource !== 'none',
    pendingSubscription: pendingSubscription || dataSource !== 'none',
    isLoading,
    dataSource,
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan,
    updateRegistrationData,
    setPaymentToken,
    clearRegistrationData,
    setRegistrationError,
    setPendingSubscription,
    validateStep,
    isAuthenticated: !!user
  };
};
