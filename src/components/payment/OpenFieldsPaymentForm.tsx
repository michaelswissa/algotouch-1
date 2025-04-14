
import React, { useState, useEffect } from 'react';
import CardcomOpenFields from './CardcomOpenFields';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

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
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [registrationDataChecked, setRegistrationDataChecked] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for registration data
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        console.log('Found registration data in OpenFieldsPaymentForm');
        setRegistrationData(JSON.parse(storedData));
      }
      setRegistrationDataChecked(true);
    } catch (err) {
      console.error('Error parsing registration data:', err);
      setRegistrationDataChecked(true);
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
          setError('Error checking subscription status');
        } finally {
          setIsCheckingSubscription(false);
        }
      } else {
        setIsCheckingSubscription(false);
      }
    };
    
    checkExistingSubscription().catch(err => {
      console.error('Error in checkExistingSubscription:', err);
      setError('Failed to check subscription status');
      setIsCheckingSubscription(false);
    });
  }, [user?.id, planId]);

  const handleRetry = () => {
    setError(null);
    // If we're checking auth or registration, retry that process
    if (!registrationDataChecked) {
      try {
        const storedData = sessionStorage.getItem('registration_data');
        if (storedData) {
          setRegistrationData(JSON.parse(storedData));
        }
        setRegistrationDataChecked(true);
      } catch (err) {
        console.error('Error parsing registration data:', err);
      }
    }
    // If we're checking subscription, retry that
    else if (isCheckingSubscription && user?.id) {
      setIsCheckingSubscription(true);
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          
          if (data && data.status !== 'cancelled') {
            setHasSubscription(true);
            
            // Check if user is changing plan
            if (data.plan_type !== planId) {
              setIsChangingPlan(true);
            }
          }
          setIsCheckingSubscription(false);
        })
        .catch((err) => {
          console.error('Error checking subscription:', err);
          setError('Error checking subscription status');
          setIsCheckingSubscription(false);
        });
    }
  };

  if (isCheckingSubscription || !registrationDataChecked) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Spinner size="lg" className="border-primary" />
        <span>{isCheckingSubscription ? 'בודק פרטי מנוי...' : 'טוען נתונים...'}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRetry} variant="outline" className="w-full">
          נסה שנית
        </Button>
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
            onPaymentStart={onPaymentStart}
            onError={onError}
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
      </CardHeader>
      <CardContent>
        <CardcomOpenFields
          planId={planId}
          onPaymentComplete={onPaymentComplete}
          onPaymentStart={onPaymentStart}
          onError={onError}
          onCancel={onCancel}
        />
      </CardContent>
    </Card>
  );
};

export default OpenFieldsPaymentForm;
