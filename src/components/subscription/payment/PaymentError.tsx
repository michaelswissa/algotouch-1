
import React from 'react';
import PaymentError from '@/components/payment/PaymentError';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';
import { ErrorDisplay } from '@/components/errors/ErrorDisplay';

interface SubscriptionPaymentErrorProps {
  onRetry: () => void;
  onBack: () => void;
  retryCount?: number;
  errorMessage?: string;
}

const SubscriptionPaymentError: React.FC<SubscriptionPaymentErrorProps> = ({ 
  onRetry, 
  onBack, 
  retryCount = 0,
  errorMessage
}) => {
  return (
    <div className="max-w-3xl mx-auto">
      {retryCount > 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              בעיה בהגדרת התשלום
            </CardTitle>
            <CardDescription>
              מנסים לחבר אותך למערכת התשלום אך נראה שיש בעיה
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ErrorDisplay
              title="שגיאה בהכנת מסך התשלום"
              message={errorMessage || "לא ניתן להתחבר למערכת התשלום"}
              code={retryCount > 3 ? "CONNECTION_FAILURE" : "PAYMENT_INIT_ERROR"}
              variant="destructive"
              showIcon={true}
              className="mb-6"
            />
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                אחרי מספר נסיונות כושלים, יתכן שיש בעיה במערכת התשלום. אנו מציעים לנסות שוב מאוחר יותר או ליצור קשר עם התמיכה.
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 ml-2" />
                חזרה לבחירת תוכנית
              </Button>
              <Button variant="default" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 ml-2" />
                נסה שוב
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PaymentError
          message={errorMessage || "שגיאה בהכנת מסך התשלום"}
          onRetry={onRetry}
          onBack={onBack}
        />
      )}
    </div>
  );
};

export default SubscriptionPaymentError;
