
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { usePaymentInitialization } from './hooks/usePaymentInitialization';
import { usePaymentUrlParams } from './hooks/usePaymentUrlParams';
import { getPlanDetails } from './PlanUtilities';
import PaymentSectionHeader from './PaymentSectionHeader';
import PaymentIframe from './PaymentIframe';
import PaymentSectionFooter from './PaymentSectionFooter';
import PaymentLoading from './PaymentLoading';
import PaymentError from './PaymentError';

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
  
  // Handle payment initialization
  const { paymentUrl, initiateCardcomPayment } = usePaymentInitialization(
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
    // We'll store the payment data in sessionStorage for later validation
    if (paymentData?.lowProfileId) {
      sessionStorage.setItem('payment_success_data', JSON.stringify({
        lowProfileId: paymentData.lowProfileId,
        transactionId: paymentData.transactionId,
        plan: selectedPlan,
        timestamp: new Date().toISOString()
      }));
    }
    
    // Complete the payment flow
    onPaymentComplete();
  };

  // Handle payment error
  const handlePaymentError = (error: Error) => {
    console.error('Payment error in parent component:', error);
    setIsLoading(false);
  };

  // Show loading screen when initializing payment
  if (isLoading) {
    return <PaymentLoading />;
  }

  // Show error screen if payment URL couldn't be generated
  if (!paymentUrl) {
    return (
      <PaymentError 
        onRetry={initiateCardcomPayment} 
        onBack={onBack} 
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
