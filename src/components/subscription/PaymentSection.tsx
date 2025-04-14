
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import CardcomIframe from '@/components/payment/CardcomIframe';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Ensure user is authenticated
  if (!user) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          יש להיות מחובר כדי לבצע תשלום. אנא התחבר או הרשם.
        </AlertDescription>
      </Alert>
    );
  }

  const handlePaymentStart = () => {
    setPaymentProcessing(true);
    setPaymentError(null);
  };

  const handlePaymentSuccess = (transactionId: string) => {
    console.log('Payment successful, transaction ID:', transactionId);
    setPaymentProcessing(false);
    setPaymentSuccess(true);
    toast.success('התשלום התקבל בהצלחה!');
    onPaymentComplete();
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setPaymentProcessing(false);
    setPaymentError(error);
    toast.error(`שגיאה בתשלום: ${error}`);
  };

  if (paymentSuccess) {
    return (
      <Alert className="max-w-lg mx-auto bg-green-50 border-green-200">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <AlertDescription className="text-green-700">
          התשלום התקבל בהצלחה! מעבד את הנתונים...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {paymentError && (
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {paymentError}
          </AlertDescription>
        </Alert>
      )}
      
      <CardcomIframe 
        planId={selectedPlan}
        onPaymentComplete={handlePaymentSuccess}
        onCancel={onBack}
        onPaymentStart={handlePaymentStart}
        onError={handlePaymentError}
      />
    </div>
  );
};

export default PaymentSection;
