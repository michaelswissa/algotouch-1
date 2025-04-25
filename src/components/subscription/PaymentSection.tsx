
import React from 'react';
import PaymentForm from '../payment/PaymentForm';

interface PaymentSectionProps {
  planId: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    [key: string]: any;
  };
  email?: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  planId, 
  userData,
  email,
  onPaymentComplete, 
  onBack 
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4">
      <PaymentForm 
        planId={planId}
        userData={userData}
        email={email}
        onPaymentComplete={onPaymentComplete} 
        onBack={onBack} 
      />
    </div>
  );
};

export default PaymentSection;
