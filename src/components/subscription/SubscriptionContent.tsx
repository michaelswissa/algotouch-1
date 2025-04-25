import React, { useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useRegistrationState } from '@/hooks/useRegistrationState';
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
    currentStep,
    registrationData,
    updateRegistrationData,
    validateAndProceed,
    finalizeRegistration
  } = useRegistrationState();
  
  const location = useLocation();
  const isRegistering = location.state?.isRegistering === true;

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
    if (planId && !registrationData?.planId) {
      updateRegistrationData({ planId });
    }
  }, [user, planId, isAuthenticated, isRegistering, checkUserSubscription, updateRegistrationData]);

  const handlePlanSelect = async (selectedPlanId: string) => {
    const success = await updateRegistrationData({ planId: selectedPlanId });
    if (success) {
      await validateAndProceed('contract');
    }
  };

  const handleContractSign = async (contractData: any) => {
    const success = await updateRegistrationData({
      contractSigned: true,
      contractSignedAt: new Date().toISOString(),
      contractDetails: {
        ...contractData,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }
    });

    if (success) {
      if (isAuthenticated && user) {
        const userData = registrationData?.userData || {};
        const userEmail = email || contractData.email || registrationData?.email;
        const userFullName = fullName || contractData.fullName || 
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

        if (userEmail && registrationData?.planId) {
          const contractSuccess = await processSignedContract(
            user.id,
            registrationData.planId,
            userFullName,
            userEmail,
            contractData
          );

          if (contractSuccess) {
            toast.success('ההסכם נחתם בהצלחה!');
            await validateAndProceed('payment');
          }
        }
      } else {
        await validateAndProceed('payment');
      }
    }
  };

  const handlePaymentComplete = async () => {
    await finalizeRegistration();
    await validateAndProceed('success');
  };

  // Show loading state while checking subscription
  if (loading || isCheckingSubscription) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-t-primary animate-spin"></div>
      </div>
    );
  }

  // Redirect logic for authenticated users with active subscriptions
  if (isAuthenticated && hasActiveSubscription) {
    return <Navigate to="/my-subscription" replace />;
  }

  // Redirect to auth if no registration data and not authenticated
  if (!isAuthenticated && !registrationData && !isRegistering) {
    return <Navigate to="/auth" state={{ redirectToSubscription: true }} replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">השלמת תהליך ההרשמה</h1>
        <p className="text-muted-foreground">יש להשלים את השלבים הבאים לקבלת גישה למערכת</p>
        
        <SubscriptionSteps currentStep={currentStep} />
      </div>
      
      {currentStep === 'plan_selection' && (
        <SubscriptionPlans 
          onSelectPlan={handlePlanSelect} 
          selectedPlanId={registrationData?.planId} 
        />
      )}
      
      {currentStep === 'contract' && registrationData?.planId && (
        <ContractSection
          selectedPlan={registrationData.planId}
          fullName={fullName || (registrationData?.userData?.firstName && 
            registrationData?.userData?.lastName ? 
            `${registrationData.userData.firstName} ${registrationData.userData.lastName}` : 
            '')}
          onSign={handleContractSign}
          onBack={() => validateAndProceed('plan_selection')}
        />
      )}
      
      {currentStep === 'payment' && registrationData?.planId && (
        <PaymentSection
          planId={registrationData.planId}
          onPaymentComplete={handlePaymentComplete}
          onBack={() => validateAndProceed('contract')}
        />
      )}
      
      {currentStep === 'success' && (
        <SubscriptionSuccess />
      )}
    </div>
  );
};

export default SubscriptionContent;
