
import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { usePaymentProcess } from './hooks/usePaymentProcess';
import PaymentErrorCard from './PaymentErrorCard';
import PaymentCardForm from './PaymentCardForm';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete }) => {
  const {
    isProcessing,
    registrationData,
    registrationError,
    loadRegistrationData,
    handleExternalPayment,
    plan
  } = usePaymentProcess({ planId, onPaymentComplete });

  // Load registration data on component mount
  useEffect(() => {
    loadRegistrationData();
  }, []);

  // If registration data is invalid, show an error and options to go back
  if (registrationError && !registrationData) {
    return <PaymentErrorCard errorMessage={registrationError} />;
  }

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>לחץ על הכפתור למטה להמשך לעמוד התשלום המאובטח</CardDescription>
      </CardHeader>
      
      <PaymentCardForm
        plan={plan}
        isProcessing={isProcessing}
        onSubmit={() => {}}
        onExternalPayment={handleExternalPayment}
        planId={planId}
      />
    </Card>
  );
};

export default PaymentForm;
