
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface PaymentSuccessProps {
  onComplete?: () => void;
  redirectPath?: string;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ 
  onComplete, 
  redirectPath = '/dashboard' 
}) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (onComplete) {
      onComplete();
    }

    // Automatically redirect after countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(redirectPath, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, onComplete, redirectPath]);

  const handleContinue = () => {
    navigate(redirectPath, { replace: true });
  };

  return (
    <Card className="max-w-lg mx-auto shadow-lg border-2 border-green-500/20" dir="rtl">
      <CardHeader className="bg-gradient-to-r from-green-500/10 to-transparent pb-6 border-b">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <CardTitle className="text-2xl text-center">התשלום התקבל בהצלחה!</CardTitle>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        <p className="text-center">
          תודה על ההזמנה שלך. התשלום התקבל בהצלחה והחשבון שלך הופעל.
        </p>
        
        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-md border border-green-200 dark:border-green-900/30">
          <p className="text-center text-green-700 dark:text-green-300">
            מועבר לדף הבית בעוד <span className="font-bold">{countdown}</span> שניות...
          </p>
        </div>
        
        <div className="flex justify-center pt-4">
          <Button onClick={handleContinue} className="min-w-[200px]">
            המשך לדף הבית
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSuccess;
