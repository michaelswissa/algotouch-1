
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useNavigate } from 'react-router-dom';
import usePaymentStatus from '@/hooks/usePaymentStatus';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatusProps {
  redirectOnSuccess?: string;
  lowProfileId?: string;
  planId?: string;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({ 
  redirectOnSuccess = '/my-subscription',
  lowProfileId,
  planId
}) => {
  const navigate = useNavigate();
  const { isChecking, paymentSuccess, paymentError, manualCheckPayment } = usePaymentStatus(redirectOnSuccess);
  const [manuallyChecking, setManuallyChecking] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Check payment status manually if lowProfileId is provided directly
  useEffect(() => {
    if (lowProfileId && !isChecking && !paymentSuccess && !manuallyChecking) {
      setManuallyChecking(true);
      manualCheckPayment(lowProfileId, planId);
    }
  }, [lowProfileId, planId, isChecking, paymentSuccess, manualCheckPayment, manuallyChecking]);

  // Retry payment verification if we have lowProfileId
  useEffect(() => {
    if (lowProfileId && paymentError && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Manually retrying payment check (${retryCount + 1}/3)...`);
        setRetryCount(prev => prev + 1);
        manualCheckPayment(lowProfileId, planId);
      }, (retryCount + 1) * 3000); // Exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [lowProfileId, planId, paymentError, retryCount, manualCheckPayment]);

  const handleRetry = () => {
    navigate('/subscription');
  };
  
  const handleGoToSubscription = () => {
    navigate(redirectOnSuccess);
  };

  const handleManualCheck = async () => {
    setManuallyChecking(true);
    
    try {
      // Try to manually check for payment if we have lowProfileId
      if (lowProfileId) {
        manualCheckPayment(lowProfileId, planId);
      } else {
        // Get from URL or localStorage
        const params = new URLSearchParams(window.location.search);
        const urlLowProfileId = params.get('lowProfileId') || localStorage.getItem('payment_pending_id');
        const urlPlanId = params.get('planId') || localStorage.getItem('payment_pending_plan');
        
        if (urlLowProfileId) {
          manualCheckPayment(urlLowProfileId, urlPlanId || undefined);
        } else {
          // Try checking recent payment logs
          const { data: recentPayments } = await supabase
            .from('user_payment_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (recentPayments && recentPayments[0]) {
            manualCheckPayment(recentPayments[0].token);
          }
        }
      }
    } catch (error) {
      console.error('Error in manual payment check:', error);
    } finally {
      setTimeout(() => {
        setManuallyChecking(false);
      }, 5000); // Reset after 5 seconds to allow for retrying
    }
  };
  
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-center">סטטוס תשלום</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(isChecking || manuallyChecking) && (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner className="h-8 w-8 mb-4 text-primary" />
            <p className="text-center">מאמת את פרטי התשלום...</p>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                ניסיון {retryCount + 1}/4...
              </p>
            )}
          </div>
        )}
        
        {paymentSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <AlertDescription className="text-green-700">
              התשלום התקבל בהצלחה! מועבר לדף המנוי שלך...
            </AlertDescription>
          </Alert>
        )}
        
        {paymentError && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-5 w-5" />
              <AlertDescription>
                {paymentError}
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center space-x-4 gap-2 flex-wrap">
              <Button variant="outline" onClick={handleGoToSubscription}>
                המשך למנוי
              </Button>
              
              <Button variant="outline" onClick={handleManualCheck} disabled={manuallyChecking}>
                {manuallyChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    בודק...
                  </>
                ) : (
                  'בדוק שוב'
                )}
              </Button>
              
              <Button onClick={handleRetry}>
                נסה שוב
              </Button>
            </div>
          </div>
        )}
        
        {!isChecking && !paymentSuccess && !paymentError && (
          <div className="flex flex-col items-center justify-center py-6">
            <Button onClick={handleManualCheck} disabled={manuallyChecking}>
              {manuallyChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  בודק סטטוס תשלום...
                </>
              ) : (
                'בדוק סטטוס תשלום'
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              אם ביצעת תשלום, לחץ על הכפתור כדי לבדוק את סטטוס התשלום.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentStatus;
