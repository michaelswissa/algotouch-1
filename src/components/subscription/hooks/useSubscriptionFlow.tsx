
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

  // Validate the current step based on available data
  const validateStep = (step: Steps): Steps => {
    console.log(`Validating step: ${step}, selectedPlan: ${selectedPlan}, contractId: ${contractId}`);
    
    // Always allow plan selection
    if (step === 'plan-selection') return step;
    
    // For contract step, we need a selected plan
    if (step === 'contract') {
      if (!selectedPlan) {
        console.log('Contract step requested but no plan selected, returning to plan selection');
        return 'plan-selection';
      }
      return step;
    }
    
    // For payment step, we need both a selected plan and a signed contract
    if (step === 'payment') {
      if (!selectedPlan) {
        console.log('Payment step requested but no plan selected, returning to plan selection');
        return 'plan-selection';
      }
      if (!contractId) {
        console.log('Payment step requested but no contract signed, returning to contract step');
        return 'contract';
      }
      return step;
    }
    
    // For completion step, validate that we've gone through the necessary steps
    if (step === 'completion') {
      // Only allow direct navigation to completion if we have evidence of completed payment
      // Check session storage for evidence of completed payment flow
      const sessionData = sessionStorage.getItem('subscription_flow');
      if (sessionData) {
        const data = JSON.parse(sessionData);
        const hasCompletedPayment = data.paymentCompleted === true;
        
        if (!hasCompletedPayment) {
          console.log('Completion step requested but payment not verified completed');
          // Check URL for specific success parameters that indicate verified payment
          const params = new URLSearchParams(window.location.search);
          const success = params.get('success');
          const forceTop = params.get('force_top');
          const lpId = params.get('lpId');
          
          if (success === 'true' && forceTop === 'true' && lpId) {
            console.log('Payment completion verified via URL parameters');
            return step;
          }
          
          if (selectedPlan && contractId) {
            console.log('Redirecting to payment step instead');
            return 'payment';
          }
          
          return 'plan-selection';
        }
      }
    }
    
    return step;
  };

  // Restore flow state from session storage with validation
  useEffect(() => {
    console.log('Initializing subscription flow...');
    
    const sessionData = sessionStorage.getItem('subscription_flow');
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan');
    
    if (sessionData) {
      try {
        const data = JSON.parse(sessionData);
        console.log("Restoring subscription flow from session:", data);
        
        // Set the data we have
        if (data.selectedPlan) setSelectedPlan(data.selectedPlan);
        if (data.contractId) setContractId(data.contractId);
        
        // Validate the step and set it
        const validatedStep = validateStep(data.step as Steps);
        setCurrentStep(validatedStep);
        
        console.log(`Restored session with step: ${validatedStep} (originally ${data.step})`);
      } catch (e) {
        console.error('Error parsing session data', e);
        setCurrentStep('plan-selection');
      }
    } else if (planParam) {
      // Handle URL parameter for plan
      console.log(`Plan specified in URL: ${planParam}, selecting it`);
      setSelectedPlan(planParam);
      setCurrentStep('contract'); // Move to contract step since we have a plan
    } else {
      console.log("No subscription flow data in session, starting from plan selection");
      setCurrentStep('plan-selection');
    }
  }, []);
  
  // Save session data whenever relevant state changes
  useEffect(() => {
    const sessionData = {
      step: currentStep,
      selectedPlan,
      contractId
    };
    console.log("Saving subscription flow to session:", sessionData);
    sessionStorage.setItem('subscription_flow', JSON.stringify(sessionData));
  }, [currentStep, selectedPlan, contractId]);

  const handlePlanSelect = (planId: string) => {
    console.log(`Plan selected: ${planId}`);
    setSelectedPlan(planId);
    
    // Always progress to contract step after selecting a plan
    setCurrentStep('contract');
  };
  
  const handleContractSign = async (contractData: any) => {
    try {
      console.log("Contract signed with data:", contractData);
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
            console.log("Contract data stored in registration data for later processing");
            
            // Save contract ID for flow validation
            if (contractData.tempContractId) {
              setContractId(contractData.tempContractId);
            }
            
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
          console.log("Contract processed successfully");
          if (typeof success === 'string') {
            setContractId(success);
          } else {
            setContractId('signed');
          }
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
    console.log("Payment completed successfully, updating flow state");
    
    // Mark payment as completed in session storage
    const sessionData = sessionStorage.getItem('subscription_flow');
    const updatedData = sessionData ? JSON.parse(sessionData) : {};
    updatedData.paymentCompleted = true;
    sessionStorage.setItem('subscription_flow', JSON.stringify(updatedData));
    
    // Move to completion step
    setCurrentStep('completion');
    
    // Refresh subscription status
    refreshSubscription();
    
    toast.success('ההרשמה הושלמה בהצלחה!');
  };
  
  const handleBackToStep = (step: Steps) => {
    console.log(`Going back to step: ${step}`);
    const validatedStep = validateStep(step);
    setCurrentStep(validatedStep);
    
    if (validatedStep !== step) {
      console.log(`Requested step ${step} was invalid, redirected to ${validatedStep}`);
    }
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
