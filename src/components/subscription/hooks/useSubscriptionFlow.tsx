
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
        if (data.step) setCurrentStep(data.step as Steps);
        if (data.selectedPlan) setSelectedPlan(data.selectedPlan);
        if (data.contractId) setContractId(data.contractId);
      } catch (e) {
        console.error('Error parsing session data', e);
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
    if (!user?.id) {
      toast.error('משתמש לא מזוהה');
      return;
    }
    
    try {
      // Process and save the contract
      const success = await processSignedContract(
        user.id,
        selectedPlan,
        fullName || contractData.fullName,
        email || contractData.email,
        contractData
      );
      
      if (success) {
        setCurrentStep('payment');
      } else {
        toast.error('שגיאה בשמירת החוזה');
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
