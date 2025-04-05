
import React, { useEffect, useState } from 'react';
import { useParams, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import SubscriptionSteps from '@/components/subscription/SubscriptionSteps';
import SubscriptionSuccess from '@/components/subscription/SubscriptionSuccess';
import ContractSection from '@/components/subscription/ContractSection';
import PaymentSection from '@/components/subscription/PaymentSection';
import { processSignedContract } from '@/lib/contracts/contract-service';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import { RegistrationData } from '@/types/payment';

const SubscriptionContent = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
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
  
  const location = useLocation();
  const isRegistering = location.state?.isRegistering === true;
  const [restoringSession, setRestoringSession] = useState(false);

  // Process URL parameters and restore any needed state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    const success = params.get('success') === 'true';
    const error = params.get('error') === 'true';
    const planParam = params.get('plan');
    const regId = params.get('regId');
    
    // Set selected plan from URL if available
    if (planParam && !selectedPlan) {
      setSelectedPlan(planParam);
    }
    
    if (error) {
      toast.error('התשלום נכשל, אנא נסה שנית');
    } 
    
    // Handle registration data restoration if we have a registration ID
    if (regId) {
      setRestoringSession(true);
      
      // Try to restore registration data from the temporary storage
      supabase.functions.invoke('cardcom-payment/get-registration-data', {
        body: { registrationId: regId }
      })
      .then(({ data, error }) => {
        if (error || !data?.success) {
          console.error('Error restoring registration data:', error || 'No data returned');
          toast.error('שגיאה בשחזור פרטי ההרשמה, אנא נסה שוב');
          return;
        }
        
        // Restore registration data
        if (data.registrationData) {
          console.log('Restoring registration data from server');
          updateRegistrationData(data.registrationData);
          
          // If payment was successful, proceed with registration
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
      });
      
      // Remove the regId parameter from URL for cleanliness
      params.delete('regId');
      navigate({ search: params.toString() }, { replace: true });
    }
    // Handle direct success without registration ID (already logged in user)
    else if (success && step === '4') {
      setCurrentStep(4);
      toast.success('התשלום התקבל בהצלחה!');
      
      // If the user is authenticated, refresh their subscription
      if (isAuthenticated && user) {
        checkUserSubscription(user.id);
      }
    }
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check subscription status for authenticated users
  useEffect(() => {
    console.log('Subscription page: Checking for registration data and subscription status', {
      isAuthenticated,
      isRegistering,
      planId
    });
    
    // For logged-in users, check subscription status
    if (isAuthenticated && user) {
      checkUserSubscription(user.id);
    }
    
    // Set initial plan from URL if available
    if (planId && !selectedPlan) {
      setSelectedPlan(planId);
    }
  }, [user, planId, isAuthenticated, isRegistering, checkUserSubscription]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process a restored registration after successful payment
  const processRestoredRegistration = async (regData: RegistrationData) => {
    console.log('Processing restored registration after payment');
    
    try {
      // Use token data from the registration to create user and subscription
      const result = await registerUser({
        registrationData: regData,
        tokenData: {
          lastFourDigits: '****', // We don't have the actual card data anymore
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
      
      // Sign in the new user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: regData.email,
        password: regData.password
      });
      
      if (signInError) {
        console.error('Error signing in after registration:', signInError);
        // Continue anyway as the user was created
      }
      
      // Clear session storage
      sessionStorage.removeItem('registration_data');
      
      // Set to success step
      setCurrentStep(4);
      toast.success('ההרשמה והתשלום הושלמו בהצלחה!');
    } catch (error: any) {
      console.error('Error processing restored registration:', error);
      toast.error(error.message || 'אירעה שגיאה בהשלמת תהליך ההרשמה');
    }
  };

  // Show loading state while checking subscription or restoring session
  if (loading || isCheckingSubscription || restoringSession) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-t-primary animate-spin"></div>
      </div>
    );
  }

  // If a logged-in user visits this page, check if they already have a subscription
  // Redirect to my-subscription page instead of dashboard
  if (isAuthenticated && hasActiveSubscription) {
    console.log('User has active subscription, redirecting to my-subscription page');
    return <Navigate to="/my-subscription" replace />;
  }

  // If no registration data is found and user is not authenticated, redirect to auth
  // Skip this check if we're restoring session or if plan is specified directly
  if (!isAuthenticated && !registrationData && !isRegistering && !planId && !restoringSession) {
    console.log('No registration data found and user is not authenticated, redirecting to auth');
    return <Navigate to="/auth" state={{ redirectToSubscription: true }} replace />;
  }

  const handlePlanSelect = (planId: string) => {
    console.log('Selected plan in handlePlanSelect:', planId);
    updateRegistrationData({ planId });
    setSelectedPlan(planId);
    setCurrentStep(2);
  };

  const handleContractSign = async (contractData: any) => {
    console.log('Contract signed, data received:', {
      hasSignature: Boolean(contractData?.signature),
      hasHTML: Boolean(contractData?.contractHtml),
      fullName: contractData?.fullName
    });
    
    // Store the contract details in the registration data
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
    
    // If the user is authenticated, process the contract in the backend
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

  const handlePaymentComplete = () => {
    setCurrentStep(4);
    console.log('Payment completed');
  };

  return (
    <div className="max-w-5xl mx-auto px-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">השלמת תהליך ההרשמה</h1>
        <p className="text-muted-foreground">יש להשלים את השלבים הבאים לקבלת גישה למערכת</p>
        
        <SubscriptionSteps currentStep={currentStep} />
      </div>
      
      {currentStep === 1 && (
        <SubscriptionPlans 
          onSelectPlan={handlePlanSelect} 
          selectedPlanId={selectedPlan} 
        />
      )}
      
      {currentStep === 2 && selectedPlan && (
        <ContractSection
          selectedPlan={selectedPlan}
          fullName={fullName || (registrationData?.userData?.firstName && registrationData?.userData?.lastName 
            ? `${registrationData.userData.firstName} ${registrationData.userData.lastName}` 
            : '')}
          onSign={handleContractSign}
          onBack={() => setCurrentStep(1)}
        />
      )}
      
      {currentStep === 3 && selectedPlan && (
        <PaymentSection
          selectedPlan={selectedPlan}
          onPaymentComplete={handlePaymentComplete}
          onBack={() => setCurrentStep(2)}
        />
      )}
      
      {currentStep === 4 && (
        <SubscriptionSuccess />
      )}
    </div>
  );
};

export default SubscriptionContent;
