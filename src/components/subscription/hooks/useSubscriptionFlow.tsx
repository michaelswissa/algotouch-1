import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { Steps } from '@/types/subscription';

export const useSubscriptionFlow = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, registrationData, setRegistrationData } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<Steps>('plan-selection');
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(planId);
  const [contractId, setContractId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Initialize subscription flow based on auth state and URL parameters
  useEffect(() => {
    const initSubscriptionFlow = async () => {
      setIsLoading(true);
      
      try {
        // If plan ID is in URL params, use it
        if (planId) {
          setSelectedPlan(planId);
          
          // Update registration data with plan ID if we're in registration flow
          if (registrationData) {
            setRegistrationData({ ...registrationData, planId });
          }
          
          // If user already selected plan, move to contract step
          setCurrentStep('contract');
        } 
        // Otherwise, check if plan is in registration data
        else if (registrationData?.planId) {
          setSelectedPlan(registrationData.planId);
          
          // If contract is signed, move to payment step
          if (registrationData.contractSigned) {
            setCurrentStep('payment');
            // You'd also need to get the contractId here
          } else {
            setCurrentStep('contract');
          }
        }
        
        // Check if user has active subscription
        if (isAuthenticated && user) {
          const { data: subscriptionData, error } = await supabase
            .from('subscriptions')
            .select('status, plan_type')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();
            
          if (subscriptionData && !error) {
            setHasActiveSubscription(true);
          }
          
          // Set full name for contract signing
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();
            
          if (profileData) {
            setFullName(`${profileData.first_name || ''} ${profileData.last_name || ''}`.trim());
          }
        } 
        // If in registration flow, get name from registration data
        else if (registrationData?.userData) {
          const { firstName, lastName } = registrationData.userData;
          setFullName(`${firstName || ''} ${lastName || ''}`.trim());
        }
      } catch (error) {
        console.error('Error initializing subscription flow:', error);
        toast.error('אירעה שגיאה בטעינת נתוני ההרשמה');
      } finally {
        setIsLoading(false);
      }
    };
    
    initSubscriptionFlow();
  }, [planId, isAuthenticated, user, registrationData, setRegistrationData]);

  // Handle plan selection
  const handlePlanSelect = (plan: string) => {
    setSelectedPlan(plan);
    
    // Update registration data
    if (registrationData) {
      setRegistrationData({ ...registrationData, planId: plan });
    }
    
    setCurrentStep('contract');
    navigate(`/subscription`, { replace: true });
  };

  // Handle contract signing
  const handleContractSign = (contractId: string) => {
    setContractId(contractId);
    
    // Update registration data
    if (registrationData) {
      setRegistrationData({ 
        ...registrationData, 
        contractSigned: true 
        // Fixed: removed contractSignedAt property which was causing the error
      });
    }
    
    setCurrentStep('payment');
  };

  // Handle payment completion
  const handlePaymentComplete = () => {
    setCurrentStep('completion');
  };

  // Handle back navigation
  const handleBackToStep = (step: Steps) => {
    setCurrentStep(step);
  };

  return {
    currentStep,
    selectedPlan,
    fullName,
    isLoading,
    hasActiveSubscription,
    contractId,
    isAuthenticated,
    handlePlanSelect,
    handleContractSign,
    handlePaymentComplete,
    handleBackToStep
  };
};
