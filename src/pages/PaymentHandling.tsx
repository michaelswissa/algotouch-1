
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PaymentSuccess from '@/components/payment/PaymentSuccess';
import PaymentError from '@/components/payment/PaymentError';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase-client';

const PaymentHandling: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isSuccessParam = params.get('success') === 'true';
    const errorParam = params.get('error') === 'true';
    const planId = params.get('plan');
    const regId = params.get('regId');

    // Clear any existing payment temp data
    localStorage.removeItem('temp_payment_session');

    // Process payment based on query parameters
    const processPayment = async () => {
      try {
        setIsLoading(true);
        
        // Case 1: Registration with success parameter
        if (regId && isSuccessParam) {
          console.log('Processing registration payment verification with regId:', regId);
          const { data, error } = await supabase.functions.invoke('verify-payment-registration', {
            body: { registrationId: regId }
          });
          
          if (error) throw new Error(error.message);
          if (!data.success) throw new Error(data.message || 'Payment verification failed');
          
          setIsSuccess(true);
          return;
        }
        
        // Case 2: Regular payment success (requires authentication)
        else if (isSuccessParam) {
          // Check if user is authenticated for regular success flow
          if (!isAuthenticated) {
            console.log('User not authenticated for success flow, redirecting to login');
            navigate('/auth', { state: { from: location } });
            return;
          }
          
          setIsSuccess(true);
          
          // Update user subscription status if needed
          if (user && planId) {
            await supabase.from('subscriptions').upsert({
              user_id: user.id,
              plan_type: planId,
              status: 'active',
              updated_at: new Date().toISOString()
            });
          }
        }
        
        // Case 3: Payment error
        else if (errorParam) {
          const errorMsg = params.get('message');
          setIsSuccess(false);
          setErrorMessage(errorMsg || 'התשלום נכשל או בוטל. אנא נסה שנית.');
        }
        
        // Case 4: No valid parameters, redirect based on auth status
        else {
          console.log('No valid payment parameters found');
          if (regId) {
            // If we have regId but no success/error, treat as error
            setIsSuccess(false);
            setErrorMessage('לא התקבל סטטוס תשלום תקין. אנא נסה שנית.');
          } else {
            // No regId and no success/error, redirect to appropriate page
            const redirectPath = isAuthenticated ? '/subscription' : '/auth';
            console.log(`No payment parameters, redirecting to ${redirectPath}`);
            navigate(redirectPath, { replace: true });
            return; // Skip setting isLoading to false since we're navigating away
          }
        }
      } catch (error: any) {
        console.error('Error processing payment result:', error);
        setIsSuccess(false);
        setErrorMessage(error.message || 'אירעה שגיאה בעיבוד התשלום');
      } finally {
        setIsLoading(false);
      }
    };

    processPayment();
  }, [location, navigate, user, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">מעבד את פרטי התשלום...</p>
      </div>
    );
  }

  if (isSuccess) {
    return <PaymentSuccess redirectPath="/dashboard" />;
  }

  // Using the updated PaymentError component with explicit redirectPath
  return <PaymentError message={errorMessage || 'אירעה שגיאה בתהליך התשלום'} redirectPath="/subscription" />;
};

export default PaymentHandling;
