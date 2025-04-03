
import React from 'react';
import PaymentForm from '@/components/payment/PaymentForm';
import { Button } from '@/components/ui/button';

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
  return (
    <div>
      <PaymentForm 
        planId={selectedPlan} 
        onPaymentComplete={onPaymentComplete} 
      />
      
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={onBack}>
          חזור
        </Button>
      </div>
    </div>
  );
};

export default PaymentSection;
