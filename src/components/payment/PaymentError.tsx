
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface PaymentErrorProps {
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

const PaymentError: React.FC<PaymentErrorProps> = ({ 
  message = 'אירעה שגיאה בתהליך התשלום',
  onRetry,
  onBack
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <Card className="max-w-lg mx-auto shadow-lg border-2 border-red-500/20" dir="rtl">
      <CardHeader className="bg-gradient-to-r from-red-500/10 to-transparent pb-6 border-b">
        <div className="flex items-center justify-center mb-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <CardTitle className="text-2xl text-center">שגיאה בתהליך התשלום</CardTitle>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        <p className="text-center">
          {message}
        </p>
        
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md border border-red-200 dark:border-red-900/30">
          <p className="text-center text-red-700 dark:text-red-300">
            ניתן לנסות שנית או לחזור לבחירת תוכנית אחרת
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              נסה שנית
            </Button>
          )}
          <Button onClick={handleBack} variant={onRetry ? "outline" : "default"}>
            חזרה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentError;
