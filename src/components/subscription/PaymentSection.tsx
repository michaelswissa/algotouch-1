
import React from 'react';
import PaymentForm from '../payment/PaymentForm';

interface PaymentSectionProps {
  planId: string;
  onPaymentComplete: (transactionId?: string) => void;
  onBack?: () => void; // Optional back handler
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  planId, 
  onPaymentComplete, 
  onBack 
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4">
      <PaymentForm 
        planId={planId} 
        onPaymentComplete={onPaymentComplete} 
        onBack={onBack} 
      />
    </div>
  );
};

export default PaymentSection;
