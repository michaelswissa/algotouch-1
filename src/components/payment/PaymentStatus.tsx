
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useNavigate } from 'react-router-dom';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { toast } from 'sonner';

interface PaymentStatusProps {
  redirectOnSuccess?: string;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({ 
  redirectOnSuccess = '/my-subscription' 
}) => {
  const navigate = useNavigate();
  const { isChecking, paymentSuccess, paymentError } = usePaymentStatus(redirectOnSuccess);
  
  // Auto-redirect after successful payment verification
  useEffect(() => {
    if (paymentSuccess) {
      // Check for stored lowProfileId to clean up
      const lowProfileId = sessionStorage.getItem('payment_lowProfileId');
      if (lowProfileId) {
        sessionStorage.removeItem('payment_lowProfileId');
        sessionStorage.removeItem('payment_planId');
      }
      
      // Redirect after a short delay to show success message
      const timer = setTimeout(() => {
        navigate(redirectOnSuccess, { replace: true });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [paymentSuccess, navigate, redirectOnSuccess]);
  
  const handleRetry = () => {
    navigate('/subscription');
  };
  
  const handleGoToSubscription = () => {
    navigate(redirectOnSuccess);
  };
  
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-center">סטטוס תשלום</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isChecking && (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner className="h-8 w-8 mb-4 text-primary" />
            <p className="text-center">מאמת את פרטי התשלום...</p>
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
            
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={handleGoToSubscription}>
                המשך למנוי
              </Button>
              <Button onClick={handleRetry}>
                נסה שוב
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentStatus;
