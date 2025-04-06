
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import { RegistrationData } from '@/types/payment';
import { registerUser } from '@/services/registration/registerUser';
import { processSignedContract } from '@/lib/contracts/contract-service';

export const useSubscriptionFlow = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const {
    hasActiveSubscription,
    isCheckingSubscription,
    checkUserSubscription,
    fullName,
    email
  } = useSubscriptionContext();
  
  const {
    registrationData,
    updateRegistrationData,
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan
  } = useRegistrationData();
  
  const isRegistering = location.state?.isRegistering === true;
  const [restoringSession, setRestoringSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Handle URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    const success = params.get('success') === 'true';
    const error = params.get('error') === 'true';
    const planParam = params.get('plan');
    const regId = params.get('regId');
    
    if (planParam && !selectedPlan) {
      setSelectedPlan(planParam);
    }
    
    if (error) {
      toast.error('התשלום נכשל, אנא נסה שנית');
    } 
    
    if (regId) {
      setRestoringSession(true);
      
      supabase.functions.invoke('cardcom-payment/get-registration-data', {
        body: { registrationId: regId }
      })
      .then(({ data, error }) => {
        if (error || !data?.success) {
          console.error('Error restoring registration data:', error || 'No data returned');
          toast.error('שגיאה בשחזור פרטי ההרשמה, אנא נסה שוב');
          return;
        }
        
        if (data.registrationData) {
          console.log('Restoring registration data from server:', {
            email: data.registrationData.email,
            hasPassword: !!data.registrationData.password,
            planId: data.registrationData.planId
          });
          
          updateRegistrationData(data.registrationData);
          
          if (success) {
            processRestoredRegistration(data.registrationData);
          }
        }
      })
      .catch(err => {
        console.error('Exception retrieving registration data:', err);
        toast.error('שגיאה בשחזור פרטי ההרשמה');
      })
      .finally(() => {
        setRestoringSession(false);
        setIsLoading(false);
      });
      
      // Remove regId from URL
      params.delete('regId');
      navigate({ search: params.toString() }, { replace: true });
    }
    else if (success && step === '4') {
      setCurrentStep(4);
      toast.success('התשלום התקבל בהצלחה!');
      
      if (isAuthenticated && user) {
        checkUserSubscription(user.id);
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [location.search]);

  // Check for auth and registration data
  useEffect(() => {
    console.log('Subscription page: Checking for registration data and subscription status', {
      isAuthenticated,
      isRegistering,
      planId,
      hasRegistrationData: !!registrationData,
      registrationEmail: registrationData?.email
    });
    
    if (isAuthenticated && user) {
      checkUserSubscription(user.id);
    }
    
    if (planId && !selectedPlan) {
      setSelectedPlan(planId);
    }
  }, [user, planId, isAuthenticated, isRegistering, checkUserSubscription]);

  // Process registration data after external payment
  const processRestoredRegistration = async (regData: RegistrationData) => {
    console.log('Processing restored registration after payment', {
      hasEmail: !!regData.email,
      hasPassword: !!regData.password,
      hasUserData: !!regData.userData,
      hasContract: !!regData.contractDetails
    });
    
    if (!regData.email || !regData.password || !regData.userData) {
      console.error('Missing required registration data');
      toast.error('חסרים פרטי הרשמה חיוניים');
      return;
    }
    
    try {
      const result = await registerUser({
        registrationData: regData,
        tokenData: {
          lastFourDigits: '****',
          expiryMonth: '**',
          expiryYear: '****',
          cardholderName: `${regData.userData.firstName || ''} ${regData.userData.lastName || ''}`.trim(),
          simulated: true
        },
        contractDetails: regData.contractDetails || null
      });
      
      if (!result.success) {
        throw new Error(result.error || 'שגיאה לא ידועה בהשלמת ההרשמה');
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: regData.email,
        password: regData.password
      });
      
      if (signInError) {
        console.error('Error signing in after registration:', signInError);
      }
      
      sessionStorage.removeItem('registration_data');
      
      setCurrentStep(4);
      toast.success('ההרשמה והתשלום הושלמו בהצלחה!');
    } catch (error: any) {
      console.error('Error processing restored registration:', error);
      toast.error(error.message || 'אירעה שגיאה בהשלמת תהליך ההרשמה');
    }
  };

  // Handle plan selection
  const handlePlanSelect = (planId: string) => {
    console.log('Selected plan in handlePlanSelect:', planId);
    updateRegistrationData({ planId });
    setSelectedPlan(planId);
    setCurrentStep(2);
  };

  // Handle contract signature
  const handleContractSign = async (contractData: any) => {
    console.log('Contract signed, data received:', {
      hasSignature: Boolean(contractData?.signature),
      hasHTML: Boolean(contractData?.contractHtml),
      fullName: contractData?.fullName
    });
    
    updateRegistrationData({
      contractSigned: true,
      contractSignedAt: new Date().toISOString(),
      contractDetails: {
        contractHtml: contractData.contractHtml,
        signature: contractData.signature,
        agreedToTerms: contractData.agreedToTerms,
        agreedToPrivacy: contractData.agreedToPrivacy,
        contractVersion: contractData.contractVersion || "1.0",
        browserInfo: contractData.browserInfo || {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }
    });
    
    if (isAuthenticated && user) {
      const userData = registrationData?.userData || {};
      const userEmail = email || contractData.email || registrationData?.email || '';
      const userFullName = fullName || contractData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      
      console.log('Processing contract with data:', {
        userId: user.id,
        planId: selectedPlan,
        fullName: userFullName,
        email: userEmail
      });
      
      if (userEmail && selectedPlan) {
        const success = await processSignedContract(
          user.id,
          selectedPlan,
          userFullName,
          userEmail,
          contractData
        );
        
        if (success) {
          toast.success('ההסכם נחתם בהצלחה!');
        }
      } else {
        console.error('Missing required data for contract processing', { userEmail, selectedPlan });
        toast.error('חסרים נתונים לעיבוד ההסכם');
      }
    } else {
      console.log('User not authenticated, storing contract data for later processing');
    }
    
    setCurrentStep(3);
  };

  // Handle payment completion
  const handlePaymentComplete = () => {
    setCurrentStep(4);
    console.log('Payment completed');
  };

  // Handle step navigation
  const handleBackToStep = (step: number) => {
    setCurrentStep(step);
  };

  return {
    currentStep,
    selectedPlan,
    fullName,
    isLoading: isLoading || isCheckingSubscription || restoringSession,
    hasActiveSubscription,
    handlePlanSelect,
    handleContractSign,
    handlePaymentComplete,
    handleBackToStep,
    isAuthenticated,
  };
};
