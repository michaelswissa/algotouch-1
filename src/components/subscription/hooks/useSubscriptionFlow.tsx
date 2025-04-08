import { useState, useEffect } from 'react';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { Steps } from '@/types/subscription';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { processSignedContract } from '@/lib/contracts/contract-service';
import { useAuth } from '@/contexts/auth';

export const useSubscriptionFlow = () => {
  const [currentStep, setCurrentStep] = useState<Steps>('plan-selection');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [contractId, setContractId] = useState<string>('');
  
  const { 
    hasActiveSubscription, 
    isCheckingSubscription: isLoading,
    fullName,
    email,
    refreshSubscription
  } = useSubscriptionContext();
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = !!email;

  // If user has session data, try to restore it
  useEffect(() => {
    const sessionData = sessionStorage.getItem('subscription_flow');
    if (sessionData) {
      try {
        const data = JSON.parse(sessionData);
        // Always ensure plan selection comes before contract
        if (data.step && data.step !== 'plan-selection' && !data.selectedPlan) {
          // If we don't have a selected plan, force back to plan selection
          setCurrentStep('plan-selection');
        } else {
          // Otherwise restore the saved step
          if (data.step) setCurrentStep(data.step as Steps);
          if (data.selectedPlan) setSelectedPlan(data.selectedPlan);
          if (data.contractId) setContractId(data.contractId);
        }
      } catch (e) {
        console.error('Error parsing session data', e);
        // Reset to beginning on error
        setCurrentStep('plan-selection');
      }
    }
  }, []);
  
  // Save session data whenever relevant state changes
  useEffect(() => {
    const sessionData = {
      step: currentStep,
      selectedPlan,
      contractId
    };
    sessionStorage.setItem('subscription_flow', JSON.stringify(sessionData));
  }, [currentStep, selectedPlan, contractId]);
  
  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setCurrentStep('contract');
  };
  
  const handleContractSign = async (contractData: any) => {
    try {
      const registrationData = sessionStorage.getItem('registration_data');
      let userId = user?.id;
      let userFullName = fullName;
      let userEmail = email;
      
      // If there's registration data and no authenticated user,
      // get the data from the registration flow
      if (!userId && registrationData) {
        try {
          const parsedData = JSON.parse(registrationData);
          
          // If we don't have the user data yet, store the contract data for later
          if (parsedData) {
            // Store contract data in registration data for processing after signup
            parsedData.contractSigned = true;
            parsedData.contractDetails = contractData;
            parsedData.contractSignedAt = new Date().toISOString();
            parsedData.planId = selectedPlan;
            
            // Update the registration data in session storage
            sessionStorage.setItem('registration_data', JSON.stringify(parsedData));
            
            // Proceed to payment step
            setCurrentStep('payment');
            return;
          }
        } catch (error) {
          console.error('Error parsing registration data:', error);
        }
      }
      
      // If we have a user ID, process the contract normally
      if (userId) {
        // Process and save the contract
        const success = await processSignedContract(
          userId,
          selectedPlan,
          userFullName || contractData.fullName,
          userEmail || contractData.email,
          contractData
        );
        
        if (success) {
          setCurrentStep('payment');
        } else {
          toast.error('שגיאה בשמירת החוזה');
        }
      } else {
        // No user and no registration data - show error
        toast.error('משתמש לא מזוהה. אנא התחבר או הירשם תחילה.');
      }
    } catch (error) {
      console.error('Error processing contract:', error);
      toast.error('שגיאה בעיבוד החוזה');
    }
  };
  
  const handlePaymentComplete = () => {
    setCurrentStep('completion');
    // Clear session data on completion
    sessionStorage.removeItem('subscription_flow');
    
    // Refresh subscription status
    refreshSubscription();
    
    toast.success('ההרשמה הושלמה בהצלחה!');
    
    // Redirect to dashboard after short delay
    setTimeout(() => {
      navigate('/dashboard');
    }, 5000);
  };
  
  const handleBackToStep = (step: Steps) => {
    setCurrentStep(step);
  };
  
  return {
    currentStep,
    selectedPlan,
    contractId,
    fullName,
    isLoading,
    hasActiveSubscription,
    handlePlanSelect,
    handleContractSign,
    handlePaymentComplete,
    handleBackToStep,
    isAuthenticated
  };
};
