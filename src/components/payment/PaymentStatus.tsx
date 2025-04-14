
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const [isChecking, setIsChecking] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success') === 'true';
    const errorParam = params.get('error') === 'true';
    const profileId = lowProfileId || params.get('lowProfileId') || localStorage.getItem('payment_pending_id');
    const paymentPlanId = planId || params.get('planId') || localStorage.getItem('payment_pending_plan');
    
    if (success) {
      handleSuccess();
      return;
    }
    
    if (errorParam) {
      handleError('התשלום נכשל או בוטל על ידי המשתמש.');
      return;
    }
    
    if (!profileId) {
      handleError('מזהה עסקה חסר. לא ניתן לאמת את התשלום.');
      return;
    }
    
    const checkPaymentStatus = async () => {
      try {
        setIsChecking(true);
        
        const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
          body: { 
            lowProfileId: profileId,
            planId: paymentPlanId
          }
        });
        
        if (error) {
          throw new Error(`שגיאה בבדיקת סטטוס תשלום: ${error.message}`);
        }
        
        console.log('Payment check response:', data);
        
        // Check if payment was successful
        if (data.ResponseCode === 0 || 
            data.OperationResponse === '0' || 
            (data.TranzactionInfo && data.TranzactionInfo.ResponseCode === 0) ||
            (data.paymentLog && data.paymentLog.status === 'completed')) {
          
          handleSuccess();
          
          // Clean up local storage payment tracking
          localStorage.removeItem('payment_pending_id');
          localStorage.removeItem('payment_pending_plan');
          localStorage.removeItem('payment_session_created');
          localStorage.removeItem('payment_processing');
          
          return;
        }
        
        // Handle ongoing check logic
        if (checkCount < 3) {
          // Try again after a delay
          setTimeout(() => {
            setCheckCount(prev => prev + 1);
          }, 2000);
        } else {
          handleError('לא ניתן לאמת את סטטוס התשלום. אנא פנה לתמיכה או נסה שוב.');
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        
        if (checkCount < 3) {
          // Try again after delay
          setTimeout(() => {
            setCheckCount(prev => prev + 1);
          }, 2000);
        } else {
          handleError(err instanceof Error ? err.message : 'שגיאה בבדיקת סטטוס התשלום');
        }
      } finally {
        if (checkCount >= 3) {
          setIsChecking(false);
        }
      }
    };
    
    checkPaymentStatus();
  }, [lowProfileId, planId, checkCount, navigate, redirectOnSuccess]);
  
  const handleSuccess = () => {
    setIsSuccess(true);
    setIsChecking(false);
    toast.success('התשלום בוצע בהצלחה!');
    
    // Give some time for the user to see the success message
    setTimeout(() => {
      navigate(redirectOnSuccess, { replace: true });
    }, 3000);
  };
  
  const handleError = (message: string) => {
    setError(message);
    setIsChecking(false);
    toast.error(message);
  };
  
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="text-center">
          {isChecking ? 'בודק סטטוס תשלום...' : 
           isSuccess ? 'התשלום התקבל בהצלחה!' : 
           'שגיאה בתהליך התשלום'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        {isChecking && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p>מעבד את פרטי התשלום...</p>
          </div>
        )}
        
        {isSuccess && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p>תודה על הרכישה! מעבד את הפרטים ומעביר אותך למנוי שלך...</p>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive" />
            <p>{error}</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center">
        {!isChecking && !isSuccess && (
          <div className="flex space-x-2 space-x-reverse">
            <Button 
              variant="default" 
              onClick={() => navigate('/subscription')}
            >
              נסה שוב
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/my-subscription')}
            >
              חזור למנוי שלי
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentStatus;
