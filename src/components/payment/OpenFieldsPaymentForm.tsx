
import React, { useState, useEffect } from 'react';
import CardcomOpenFields from './CardcomOpenFields';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import usePaymentStatus from '@/hooks/usePaymentStatus';

interface OpenFieldsPaymentFormProps {
  planId: string;
  onPaymentComplete: (transactionId: string) => void;
  onPaymentStart?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const OpenFieldsPaymentForm: React.FC<OpenFieldsPaymentFormProps> = ({ 
  planId, 
  onPaymentComplete,
  onPaymentStart,
  onError,
  onCancel 
}) => {
  const { user } = useAuth();
  const { email: contextEmail } = useSubscriptionContext();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Use the payment status hook to check for completed payments
  const { isChecking, paymentSuccess, paymentError } = usePaymentStatus();

  // Check for registration data
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        console.log('Found registration data in OpenFieldsPaymentForm');
        setRegistrationData(JSON.parse(storedData));
      }
    } catch (err) {
      console.error('Error parsing registration data:', err);
      setErrorMessage('אירעה שגיאה בטעינת נתוני ההרשמה');
    }
  }, []);

  // Check if user already has a subscription when the component mounts
  useEffect(() => {
    const checkExistingSubscription = async () => {
      if (user?.id) {
        try {
          setIsCheckingSubscription(true);
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (error) throw error;
          
          if (data && data.status !== 'cancelled') {
            setHasSubscription(true);
            
            // Check if user is changing plan
            if (data.plan_type !== planId) {
              setIsChangingPlan(true);
            }
          }
        } catch (err) {
          console.error('Error checking subscription:', err);
          setErrorMessage('אירעה שגיאה בבדיקת פרטי המנוי');
        } finally {
          setIsCheckingSubscription(false);
        }
      } else {
        setIsCheckingSubscription(false);
      }
    };
    
    checkExistingSubscription();
  }, [user?.id, planId]);

  // Handle successful payment from URL parameters
  useEffect(() => {
    if (paymentSuccess) {
      setProcessingPayment(false);
      onPaymentComplete('redirect-success');
    } else if (paymentError) {
      setProcessingPayment(false);
      setErrorMessage(paymentError);
      if (onError) {
        onError(paymentError);
      }
    }
  }, [paymentSuccess, paymentError, onPaymentComplete, onError]);

  const handlePaymentStart = () => {
    setProcessingPayment(true);
    if (onPaymentStart) {
      onPaymentStart();
    }
  };

  const handlePaymentError = (error: string) => {
    setProcessingPayment(false);
    setErrorMessage(error);
    if (onError) {
      onError(error);
    }
  };

  if (isCheckingSubscription || isChecking) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 rounded-full border-4 border-t-primary animate-spin"></div>
        <span className="mr-4">בודק פרטי מנוי...</span>
      </div>
    );
  }

  // Determine if this is an authenticated user or registration flow
  const isAuthenticated = !!user?.id;
  const isRegistering = !!registrationData;
  const isValidUser = isAuthenticated || isRegistering;

  if (!isValidUser) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          המשתמש לא מחובר. אנא התחבר או השלם את תהליך ההרשמה.
        </AlertDescription>
      </Alert>
    );
  }

  // If user is already subscribed, show warning or change plan option
  if (hasSubscription && !isChangingPlan) {
    return (
      <Alert className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          יש לך כבר מנוי פעיל. ניתן לראות את פרטי המנוי שלך בדף המנוי שלי.
        </AlertDescription>
      </Alert>
    );
  }

  // If user is changing plans, show confirmation
  if (hasSubscription && isChangingPlan) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>שינוי תכנית מנוי</CardTitle>
          <CardDescription>
            אתה עומד לשנות את תכנית המנוי שלך. השינוי יכנס לתוקף מיד עם אישור התשלום.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CardcomOpenFields
            planId={planId}
            onPaymentComplete={onPaymentComplete}
            onPaymentStart={handlePaymentStart}
            onError={handlePaymentError}
            onCancel={onCancel}
          />
        </CardContent>
      </Card>
    );
  }

  // Regular payment flow (new subscription or registration)
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>
          {isRegistering ? 'השלם את פרטי התשלום להשלמת ההרשמה' : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
        </CardDescription>
        {errorMessage && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <CardcomOpenFields
          planId={planId}
          onPaymentComplete={onPaymentComplete}
          onPaymentStart={handlePaymentStart}
          onError={handlePaymentError}
          onCancel={onCancel}
        />
      </CardContent>
    </Card>
  );
};

export default OpenFieldsPaymentForm;
