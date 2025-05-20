
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { usePaymentInitialization } from './hooks/usePaymentInitialization';
import { usePaymentUrlParams } from './hooks/usePaymentUrlParams';
import { getPlanDetails } from './PlanUtilities';
import PaymentSectionHeader from './PaymentSectionHeader';
import PaymentIframe from './PaymentIframe';
import PaymentSectionFooter from './PaymentSectionFooter';
import PaymentLoading from './PaymentLoading';
import SubscriptionPaymentError from './PaymentError';
import { PaymentLogger } from '@/services/logging/paymentLogger';
import { useAuth } from '@/contexts/auth';

interface PaymentSectionProps {
  selectedPlan: string;
  onPaymentComplete: () => void;
  onBack: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  selectedPlan,
  onPaymentComplete,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Generate a session ID for this payment flow if we don't have one
  useEffect(() => {
    if (!sessionId) {
      const newSessionId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      setSessionId(newSessionId);
      
      // Reset the PaymentLogger session to ensure clean logging
      PaymentLogger.resetSessionId();
      
      // Store the session ID in localStorage for potential error recovery
      localStorage.setItem('current_payment_session', newSessionId);
    }
    
    return () => {
      // Clean up on unmount
      localStorage.removeItem('current_payment_session');
    };
  }, [sessionId]);
  
  // Log component mount with plan selection
  useEffect(() => {
    PaymentLogger.info(
      'Payment section mounted', 
      'payment-section', 
      { 
        plan: selectedPlan,
        isAuthenticated: !!user,
        userId: user?.id || 'guest',
        sessionId
      }
    );
    
    return () => {
      PaymentLogger.info('Payment section unmounted', 'payment-section', {
        sessionId
      });
    };
  }, [selectedPlan, user, sessionId]);
  
  // Handle payment initialization
  const { 
    paymentUrl, 
    initiateCardcomPayment, 
    isLoading: isInitLoading, 
    error: initError,
    errorCode,
    errorDetails,
    transactionId
  } = usePaymentInitialization(
    selectedPlan,
    onPaymentComplete, 
    onBack, 
    setIsLoading
  );
  
  // Handle URL parameters for success/error redirects
  usePaymentUrlParams(onPaymentComplete, setIsLoading);
  
  // Determine if this is a monthly plan (with trial)
  const isMonthlyPlan = selectedPlan === 'monthly';

  // Handle payment success
  const handlePaymentSuccess = (paymentData: any) => {
    console.log('Payment successful in parent component:', paymentData);
    PaymentLogger.success(
      'Payment completed successfully', 
      'payment-process', 
      { 
        plan: selectedPlan, 
        lowProfileId: paymentData?.lowProfileId || 'unknown',
        paymentMethod: 'iframe',
        transactionId: paymentData?.transactionId || 'unknown',
        sessionId
      }
    );
    
    // We'll store the payment data in sessionStorage for later validation
    if (paymentData?.lowProfileId) {
      sessionStorage.setItem('payment_success_data', JSON.stringify({
        lowProfileId: paymentData.lowProfileId,
        transactionId: paymentData.transactionId,
        plan: selectedPlan,
        timestamp: new Date().toISOString(),
        sessionId
      }));
    }
    
    // Complete the payment flow
    onPaymentComplete();
  };

  // Handle payment error
  const handlePaymentError = (error: Error) => {
    console.error('Payment error in parent component:', error);
    PaymentLogger.error(
      'Payment error in parent component', 
      'payment-process', 
      {
        error: error.message,
        plan: selectedPlan,
        isAuthenticated: !!user,
        userId: user?.id || 'guest',
        sessionId
      }
    );
    setIsLoading(false);
  };

  // Handle retry of payment initialization
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    PaymentLogger.info(
      'Retrying payment initialization', 
      'payment-retry', 
      { 
        retryCount: retryCount + 1, 
        plan: selectedPlan,
        sessionId 
      }
    );
    initiateCardcomPayment();
  };

  // Show loading screen when initializing payment
  if (isLoading) {
    return <PaymentLoading />;
  }

  // Show error screen if payment URL couldn't be generated
  if (!paymentUrl) {
    return (
      <SubscriptionPaymentError 
        onRetry={handleRetry} 
        onBack={onBack} 
        retryCount={retryCount}
        errorMessage={initError || 'שגיאה ביצירת דף התשלום'}
        errorDetails={errorDetails}
        errorCode={errorCode}
        transactionId={transactionId}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card 
        className="max-w-2xl mx-auto border-primary/30 shadow-[0_10px_24px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_30px_-5px_rgba(0,102,255,0.2)] animate-fade-in" 
        dir="rtl"
      >
        <PaymentSectionHeader 
          selectedPlan={selectedPlan} 
          getPlanDetails={() => getPlanDetails(selectedPlan)} 
        />
        
        <PaymentIframe 
          paymentUrl={paymentUrl} 
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
        
        <PaymentSectionFooter 
          isLoading={isLoading} 
          isMonthlyPlan={isMonthlyPlan} 
          onBack={onBack} 
        />
      </Card>
    </div>
  );
};

export default PaymentSection;
