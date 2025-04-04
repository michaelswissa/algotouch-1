
import React, { useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import SubscriptionSteps from '@/components/subscription/SubscriptionSteps';
import SubscriptionSuccess from '@/components/subscription/SubscriptionSuccess';
import ContractSection from '@/components/subscription/ContractSection';
import PaymentSection from '@/components/subscription/PaymentSection';
import { processSignedContract } from '@/lib/contracts/contract-service';
import SubscriptionPlans from '@/components/SubscriptionPlans';

const SubscriptionContent = () => {
  const { planId } = useParams<{ planId: string }>();
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

  useEffect(() => {
    console.log('Subscription page: Checking for registration data and subscription status', {
      isAuthenticated,
      isRegistering,
      planId,
      registrationData: !!registrationData
    });
    
    // For logged-in users, check subscription status
    if (isAuthenticated && user) {
      checkUserSubscription(user.id);
    }
    
    // Set initial plan from URL if available
    if (planId && !selectedPlan) {
      setSelectedPlan(planId);
    }
  }, [user, planId, isAuthenticated, isRegistering, checkUserSubscription]);

  // Show loading state while checking subscription
  if (loading || isCheckingSubscription) {
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
  // But only if not coming from the registration process
  if (!isAuthenticated && !registrationData && !isRegistering) {
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
      fullName: contractData?.fullName,
      isAuthenticated
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
          email={email || registrationData?.email}
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
