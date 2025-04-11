
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import OpenFieldsPaymentForm from '@/components/payment/OpenFieldsPaymentForm';

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
  const { user } = useAuth();
  const { fullName, email } = useSubscriptionContext();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Check for registration data in session storage on component mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        setRegistrationData(JSON.parse(storedData));
      } catch (error) {
        console.error('Error parsing registration data:', error);
      }
    }
  }, []);

  // Check URL parameters for payment status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const success = params.get('success');
    
    if (error === 'true') {
      setPaymentError('התשלום נכשל, אנא נסה שנית');
      toast.error('התשלום נכשל, אנא נסה שנית');
    } else if (success === 'true') {
      setPaymentSuccess(true);
      toast.success('התשלום התקבל בהצלחה!');
      onPaymentComplete();
    }
  }, [onPaymentComplete]);

  // User is considered "valid" if they are either:
  // 1. Logged in (authenticated) OR
  // 2. In the registration process with valid data in sessionStorage
  const isValidUser = user || registrationData;

  const handlePaymentStart = () => {
    setPaymentProcessing(true);
    setPaymentError(null);
  };

  const handlePaymentSuccess = (transactionId: string) => {
    console.log('Payment successful, transaction ID:', transactionId);
    setPaymentProcessing(false);
    setPaymentSuccess(true);
    toast.success('התשלום התקבל בהצלחה!');
    
    // Clear session storage if this was a registration flow
    if (registrationData) {
      sessionStorage.removeItem('registration_data');
    }
    
    onPaymentComplete();
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setPaymentProcessing(false);
    setPaymentError(error);
    toast.error(`שגיאה בתשלום: ${error}`);
  };

  if (!isValidUser) {
    return (
      <Alert className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          יש להיות מחובר כדי להמשיך לתשלום. אנא התחבר או הירשם.
        </AlertDescription>
      </Alert>
    );
  }

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
      
      <OpenFieldsPaymentForm 
        planId={selectedPlan}
        onPaymentComplete={handlePaymentSuccess}
        onCancel={onBack}
        onPaymentStart={handlePaymentStart}
        onError={handlePaymentError}
      />
      
      <div className="flex justify-start">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="mx-auto"
          disabled={paymentProcessing}
        >
          חזור
        </Button>
      </div>
    </div>
  );
};

export default PaymentSection;
