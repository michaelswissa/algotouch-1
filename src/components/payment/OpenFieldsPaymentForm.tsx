
import React from 'react';
import CardcomIframe from './CardcomIframe';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';
import { getSubscriptionPlans } from './utils/paymentHelpers';

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
    onError('כתובת אימייל חסרה. לא ניתן להמשיך בתהליך התשלום.');
    return null;
  }

  return (
    <div className="w-full">
      <CardcomIframe
        planId={planId}
        amount={plan.price}
        userName={fullName}
        userEmail={userEmail}
        onSuccess={onPaymentComplete}
        onError={onError}
        onCancel={onCancel}
      />
    </div>
  );
};

export default OpenFieldsPaymentForm;
