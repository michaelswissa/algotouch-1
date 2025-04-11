
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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
      toast.error('התשלום נכשל, אנא נסה שנית');
    } else if (success === 'true') {
      toast.success('התשלום התקבל בהצלחה!');
      onPaymentComplete();
    }
  }, [onPaymentComplete]);

  // User is considered "valid" if they are either:
  // 1. Logged in (authenticated) OR
  // 2. In the registration process with valid data in sessionStorage
  const isValidUser = user || registrationData;

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

  return (
    <div className="space-y-6">
      <OpenFieldsPaymentForm 
        planId={selectedPlan}
        onPaymentComplete={onPaymentComplete}
        onCancel={onBack}
      />
      
      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack} className="mx-auto">
          חזור
        </Button>
      </div>
    </div>
  );
};

export default PaymentSection;
