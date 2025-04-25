
import React, { useEffect } from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useRegistration } from '@/contexts/registration/RegistrationContext';
import SubscriptionSteps from '@/components/subscription/SubscriptionSteps';
import SubscriptionSuccess from '@/components/subscription/SubscriptionSuccess';
import ContractSection from '@/components/subscription/ContractSection';
import PaymentSection from '@/components/subscription/PaymentSection';
import { processSignedContract } from '@/lib/contracts/contract-service';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import { Spinner } from '@/components/ui/spinner';

const SubscriptionContent = () => {
  const { planId: urlPlanId } = useParams<{ planId: string }>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { 
    hasActiveSubscription, 
    isCheckingSubscription, 
    checkUserSubscription,
    fullName,
    email
  } = useSubscriptionContext();
  
  const {
    registrationData,
    isInitializing,
    updateRegistrationData,
    validateAndProceed,
    finalizeRegistration
  } = useRegistration();
  
  const location = useLocation();

  // Check authentication and subscription status
  useEffect(() => {
    if (isAuthenticated && user) {
      checkUserSubscription(user.id);
    }
  }, [isAuthenticated, user, checkUserSubscription]);
  
  // Initialize plan from URL if available
  useEffect(() => {
    if (urlPlanId && !registrationData.planId && registrationData.id) {
      updateRegistrationData({ planId: urlPlanId });
    }
  }, [urlPlanId, registrationData.planId, registrationData.id, updateRegistrationData]);

  const handlePlanSelect = async (selectedPlanId: string) => {
    const success = await updateRegistrationData({ planId: selectedPlanId });
    if (success) {
      await validateAndProceed('contract');
    }
  };

  const handleContractSign = async (contractData: any) => {
    // First save contract data
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
        // Get the most accurate user information available
        const userEmail = email || contractData.email || registrationData.email;
        const userName = fullName || 
          contractData.fullName || 
          `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim();

        if (userEmail && registrationData.planId) {
          try {
            const contractSuccess = await processSignedContract(
              user.id,
              registrationData.planId,
              userName,
              userEmail,
              contractData
            );

            if (contractSuccess) {
              toast.success('ההסכם נחתם בהצלחה!');
              await validateAndProceed('payment');
            }
          } catch (error) {
            console.error('Error processing contract:', error);
            toast.error('אירעה שגיאה בשמירת החוזה החתום');
          }
        }
      } else {
        // For non-authenticated users, just proceed to next step
        await validateAndProceed('payment');
      }
    }
  };

  const handlePaymentComplete = async () => {
    await finalizeRegistration();
    await validateAndProceed('success');
  };

  // Show loading state while initializing
  if (isInitializing || authLoading || isCheckingSubscription) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  // Redirect logic for authenticated users with active subscriptions
  if (isAuthenticated && hasActiveSubscription) {
    return <Navigate to="/my-subscription" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">השלמת תהליך ההרשמה</h1>
        <p className="text-muted-foreground">יש להשלים את השלבים הבאים לקבלת גישה למערכת</p>
        
        <SubscriptionSteps currentStep={registrationData.currentStep} />
      </div>
      
      {registrationData.currentStep === 'plan_selection' && (
        <SubscriptionPlans 
          onSelectPlan={handlePlanSelect} 
          selectedPlanId={registrationData.planId} 
        />
      )}
      
      {registrationData.currentStep === 'contract' && registrationData.planId && (
        <ContractSection
          selectedPlan={registrationData.planId}
          fullName={fullName || (registrationData.userData?.firstName && 
            registrationData.userData?.lastName ? 
            `${registrationData.userData.firstName} ${registrationData.userData.lastName}` : 
            '')}
          email={email || registrationData.email}
          phone={registrationData.userData?.phone}
          onSign={handleContractSign}
          onBack={() => validateAndProceed('plan_selection')}
        />
      )}
      
      {registrationData.currentStep === 'payment' && registrationData.planId && (
        <PaymentSection
          planId={registrationData.planId}
          userData={registrationData.userData}
          email={registrationData.email}
          onPaymentComplete={handlePaymentComplete}
          onBack={() => validateAndProceed('contract')}
        />
      )}
      
      {registrationData.currentStep === 'success' && (
        <SubscriptionSuccess />
      )}
    </div>
  );
};

export default SubscriptionContent;
