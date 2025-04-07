
import React from 'react';
import { Card } from '@/components/ui/card';
import { usePaymentInitialization } from './hooks/usePaymentInitialization';
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
  const {
    isLoading,
    paymentUrl,
    initiateCardcomPayment
  } = usePaymentInitialization(selectedPlan, onPaymentComplete, onBack);

  const isMonthlyPlan = selectedPlan === 'monthly';

  if (isLoading) {
    return <PaymentLoading />;
  }

  if (!paymentUrl) {
    return (
      <PaymentError 
        onRetry={initiateCardcomPayment} 
        onBack={onBack} 
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="max-w-3xl mx-auto border-primary/30 shadow-xl overflow-hidden hover-glow" dir="rtl">
        <PaymentSectionHeader 
          selectedPlan={selectedPlan} 
          getPlanDetails={() => getPlanDetails(selectedPlan)} 
        />
        
        <PaymentIframe paymentUrl={paymentUrl} />
        
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
