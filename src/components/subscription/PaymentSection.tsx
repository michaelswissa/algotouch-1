
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PaymentForm from '../payment/PaymentForm';

interface PaymentSectionProps {
  planId: string;
  onPaymentComplete: () => void;
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
