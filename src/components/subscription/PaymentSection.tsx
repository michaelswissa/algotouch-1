
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import CardcomIframe from '@/components/payment/CardcomIframe';
import { useNavigate } from 'react-router-dom';
import usePaymentStatus from '@/hooks/usePaymentStatus';
import PaymentStatus from '@/components/payment/PaymentStatus';
import { getSubscriptionPlans } from '@/components/payment/utils/paymentHelpers';

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
  const { fullName, email } = useSubscriptionContext();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Get plan details
  const planDetails = getSubscriptionPlans();
  const plan = selectedPlan === 'annual' 
    ? planDetails.annual 
    : selectedPlan === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Use hook to check payment status from URL parameters
  const { isChecking, paymentSuccess: urlPaymentSuccess, paymentError: urlPaymentError } = usePaymentStatus();

  // Check if we are returning from a payment redirect
  const params = new URLSearchParams(window.location.search);
  const hasPaymentParams = params.has('success') || params.has('error') || params.has('lowProfileId');

  // Check for registration data in session storage on component mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        console.log('Found registration data in PaymentSection:', data);
        setRegistrationData(data);
      } catch (error) {
        console.error('Error parsing registration data:', error);
      }
    }
  }, []);

  // Handle payment status from URL parameters
  useEffect(() => {
    if (urlPaymentSuccess) {
      setPaymentSuccess(true);
      onPaymentComplete();
    } else if (urlPaymentError) {
      setPaymentError(urlPaymentError);
      toast.error(`שגיאה בתשלום: ${urlPaymentError}`);
    }
  }, [urlPaymentSuccess, urlPaymentError, onPaymentComplete]);

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

  // User is considered "valid" if they are either:
  // 1. Logged in (authenticated) OR
  // 2. In the registration process with valid data in sessionStorage
  const isAuthenticated = !!user;
  const isRegistering = !!registrationData;
  const isValidUser = isAuthenticated || isRegistering;
  
  // Determine user email for payment
  const userEmail = email || (user?.email) || (registrationData?.email) || '';

  // If we're returning from a payment redirect, show the payment status component
  if (hasPaymentParams) {
    return (
      <PaymentStatus 
        redirectOnSuccess="/my-subscription"
        lowProfileId={params.get('lowProfileId') || undefined}
        planId={params.get('planId') || selectedPlan}
      />
    );
  }

  // Show loading state while checking payment status
  if (isChecking) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="h-8 w-8 rounded-full border-4 border-t-primary animate-spin" />
        <span className="mr-4">בודק סטטוס תשלום...</span>
      </div>
    );
  }

  if (!isValidUser) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          יש להיות מחובר או להשלים את תהליך ההרשמה כדי להמשיך לתשלום.
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

  if (!userEmail) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          נדרשת כתובת אימייל לביצוע התשלום. נא להשלים את הפרטים ולנסות שוב.
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
        amount={plan.price}
        userName={fullName}
        userEmail={userEmail}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        onCancel={onBack}
      />
    </div>
  );
};

export default PaymentSection;
