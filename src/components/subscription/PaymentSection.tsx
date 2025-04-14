
import React from 'react';
import PaymentForm from '../payment/PaymentForm';

interface PaymentSectionProps {
  planId: string;
  onPaymentComplete: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ planId, onPaymentComplete }) => {
  return (
    <div className="max-w-2xl mx-auto px-4">
      <PaymentForm planId={planId} onPaymentComplete={onPaymentComplete} />
    </div>
  );
};

export default PaymentSection;
