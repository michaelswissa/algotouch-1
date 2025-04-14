
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentStatusProps {
  lowProfileId?: string;
  planId?: string;
  redirectOnSuccess?: string;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({ 
  lowProfileId,
  planId,
  redirectOnSuccess = '/my-subscription'
}) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [checkCount, setCheckCount] = useState(0);
  const maxChecks = 10; // Maximum number of status checks

  useEffect(() => {
    const checkPaymentStatus = async () => {
      // Avoid excessive checks
      if (checkCount >= maxChecks) {
        setStatus('error');
        setErrorMessage('תהליך התשלום לא הושלם בזמן המוקצב');
        return;
      }

      setCheckCount(prevCount => prevCount + 1);
      
      // Get payment parameters from URL if not provided
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const error = params.get('error');
      const urlLowProfileId = params.get('lowProfileId');
      const urlPlanId = params.get('planId');
      
      // Use provided values or fall back to URL params or localStorage
      const profileIdToCheck = lowProfileId || 
                              urlLowProfileId || 
                              localStorage.getItem('payment_pending_id');
      
      const planIdToCheck = planId || 
                           urlPlanId || 
                           localStorage.getItem('payment_pending_plan');
      
      if (!profileIdToCheck) {
        setStatus('error');
        setErrorMessage('מזהה תשלום חסר, לא ניתן לאמת את סטטוס התשלום');
        return;
      }

      try {
        console.log('Checking payment status for:', { 
          profileIdToCheck, 
          planIdToCheck, 
          attempt: checkCount 
        });
        
        // Check payment status with the dedicated function
        const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
          body: { 
            lowProfileId: profileIdToCheck,
            planId: planIdToCheck
          }
        });
        
        if (error) {
          console.error('Error checking payment status:', error);
          throw new Error(error.message);
        }
        
        console.log('Payment status response:', data);
        
        // Check if the transaction was successful
        if (data.success === true || 
            data.ResponseCode === 0 || 
            data.OperationResponse === '0' || 
            (data.TranzactionInfo && data.TranzactionInfo.ResponseCode === 0) ||
            (data.paymentLog && data.paymentLog.status === 'completed')) {
          
          setStatus('success');
          
          // Success toast based on plan type
          if (planIdToCheck === 'monthly') {
            toast.success('נרשמת בהצלחה לתקופת ניסיון!');
          } else if (planIdToCheck === 'annual') {
            toast.success('נרשמת בהצלחה למנוי שנתי!');
          } else if (planIdToCheck === 'vip') {
            toast.success('נרשמת בהצלחה למנוי VIP!');
          } else {
            toast.success('התשלום התקבל בהצלחה!');
          }
          
          // Clean up stored payment session data
          localStorage.removeItem('payment_pending_id');
          localStorage.removeItem('payment_pending_plan');
          localStorage.removeItem('payment_session_created');
          
          // Process registration data if this was part of registration flow
          const storedData = sessionStorage.getItem('registration_data');
          if (storedData) {
            try {
              console.log('Registration completed successfully, removing stored data');
              sessionStorage.removeItem('registration_data');
              sessionStorage.removeItem('contract_data');
            } catch (err) {
              console.error('Error processing registration data:', err);
            }
          }
          
          // Allow time for the toast to show before redirecting
          setTimeout(() => {
            navigate(redirectOnSuccess, { replace: true });
          }, 2000);
        } else if (checkCount < maxChecks) {
          // Not yet processed or failed, schedule another check
          const delay = Math.min(2000 * (checkCount + 1), 10000); // Exponential backoff, max 10s
          setTimeout(() => {
            // Increment retry count if we've checked a few times already
            if (checkCount > 3 && checkCount % 2 === 0) {
              setRetryCount(prevCount => prevCount + 1);
            }
          }, delay);
        } else {
          // Max checks reached
          setStatus('error');
          setErrorMessage(data.message || data.Description || 'אירעה שגיאה בתהליך התשלום');
          toast.error('התשלום לא הושלם בהצלחה');
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        
        if (checkCount < maxChecks) {
          // Schedule another check with exponential backoff
          const delay = Math.min(2000 * (checkCount + 1), 10000);
          setTimeout(() => {
            if (checkCount > 3 && checkCount % 2 === 0) {
              setRetryCount(prevCount => prevCount + 1);
            }
          }, delay);
        } else {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'אירעה שגיאה בבדיקת סטטוס התשלום');
        }
      }
    };

    checkPaymentStatus();
  }, [lowProfileId, planId, navigate, redirectOnSuccess, retryCount, checkCount, maxChecks]);

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="h-8 w-8 border-4 border-t-primary animate-spin rounded-full"></div>
        <p className="text-lg">בודק את סטטוס התשלום...</p>
        {retryCount > 0 && (
          <p className="text-sm text-muted-foreground">
            ניסיון {retryCount + 1}/5. עיבוד התשלום יכול להימשך מספר שניות...
          </p>
        )}
      </div>
    );
  }

  if (status === 'success') {
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
    <div className="space-y-4 max-w-lg mx-auto">
      <Alert variant="destructive">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription>
          {errorMessage || 'אירעה שגיאה בתהליך התשלום'}
        </AlertDescription>
      </Alert>
      
      <div className="flex justify-center gap-4">
        <Button onClick={() => navigate('/subscription')} variant="outline">
          נסה שוב
        </Button>
        <Button onClick={() => navigate('/dashboard')} variant="default">
          חזרה לדף הבית
        </Button>
      </div>
    </div>
  );
};

export default PaymentStatus;
