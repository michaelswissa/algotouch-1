
import React from 'react';
import CardcomOpenFields from './CardcomOpenFields';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface OpenFieldsPaymentFormProps {
  planId: string;
  onPaymentComplete: (transactionId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  onPaymentStart?: () => void;
}

const OpenFieldsPaymentForm: React.FC<OpenFieldsPaymentFormProps> = ({
  planId,
  onPaymentComplete,
  onError,
  onCancel,
  onPaymentStart
}) => {
  const { user } = useAuth();
  const { fullName, email } = useSubscriptionContext();
  
  // Get plan details
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Determine the email to use for payment (registration data or authenticated user)
  const registrationData = sessionStorage.getItem('registration_data') 
    ? JSON.parse(sessionStorage.getItem('registration_data')!) 
    : null;
  
  const userEmail = email || (user?.email) || (registrationData?.email) || '';

  // Call payment start handler if provided
  React.useEffect(() => {
    if (onPaymentStart) {
      onPaymentStart();
    }
  }, [onPaymentStart]);

  if (!userEmail) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          כתובת אימייל חסרה. לא ניתן להמשיך בתהליך התשלום.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      <CardcomOpenFields
        planId={planId}
        onPaymentComplete={onPaymentComplete}
        onError={onError}
        onCancel={onCancel}
        onPaymentStart={onPaymentStart}
      />
    </div>
  );
};

export default OpenFieldsPaymentForm;
