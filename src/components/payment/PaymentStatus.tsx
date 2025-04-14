
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import usePaymentStatus from '@/hooks/usePaymentStatus';

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
      setManuallyChecking(false);
    }
  }, [lowProfileId, planId, isChecking, paymentSuccess, manuallyChecking, manualCheckPayment]);
  
  const handleRetry = () => {
    navigate('/subscription');
  };
  
  const handleGoToSubscription = () => {
    navigate(redirectOnSuccess);
  };

  const handleManualCheck = async () => {
    setManuallyChecking(true);
    setRetryCount(prev => prev + 1);
    
    try {
      if (lowProfileId) {
        await manualCheckPayment(lowProfileId, planId);
      } else {
        // Get from URL parameters
        const url = new URL(window.location.href);
        const urlLowProfileId = url.searchParams.get('lowProfileId');
        const urlPlanId = url.searchParams.get('planId');
        
        if (urlLowProfileId) {
          await manualCheckPayment(urlLowProfileId, urlPlanId || undefined);
        } else {
          throw new Error('מזהה תשלום לא נמצא');
        }
      }
    } catch (error) {
      console.error('Error manually checking payment:', error);
    } finally {
      setManuallyChecking(false);
    }
  };

  if (isChecking || manuallyChecking) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-center">בודק סטטוס תשלום</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-8 w-8 rounded-full border-4 border-t-primary animate-spin mb-4"></div>
            <p className="text-center">מאמת את פרטי התשלום...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (paymentSuccess) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-center">התשלום התקבל בהצלחה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <AlertDescription className="text-green-700">
              התשלום התקבל בהצלחה! מועבר לדף המנוי שלך...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-center">סטטוס תשלום</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentError ? (
          <Alert variant="destructive">
            <XCircle className="h-5 w-5" />
            <AlertDescription>{paymentError}</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>לא ניתן לאמת את סטטוס התשלום</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-center space-x-4 gap-2">
          <Button variant="outline" onClick={handleGoToSubscription}>
            המשך למנוי
          </Button>
          
          <Button
            variant="outline"
            onClick={handleManualCheck}
            disabled={manuallyChecking || retryCount >= 3}
          >
            {manuallyChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                בודק...
              </>
            ) : (
              'בדוק שוב'
            )}
          </Button>
          
          <Button variant="ghost" onClick={handleRetry}>
            נסה תשלום שוב
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentStatus;
