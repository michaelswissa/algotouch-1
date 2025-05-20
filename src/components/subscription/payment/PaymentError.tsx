
import React from 'react';
import PaymentErrorBase from '@/components/payment/PaymentError';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import { ErrorDisplay } from '@/components/errors/ErrorDisplay';
import { PaymentLogger } from '@/services/logging/paymentLogger';

interface SubscriptionPaymentErrorProps {
  onRetry: () => void;
  onBack: () => void;
  retryCount?: number;
  errorMessage?: string;
  errorDetails?: string;
  errorCode?: string;
  transactionId?: string;
}

const SubscriptionPaymentError: React.FC<SubscriptionPaymentErrorProps> = ({ 
  onRetry, 
  onBack, 
  retryCount = 0,
  errorMessage,
  errorDetails,
  errorCode,
  transactionId
}) => {
  // Log the error when component mounts
  React.useEffect(() => {
    PaymentLogger.error(
      errorMessage || 'Payment initialization error',
      'payment-error-display',
      {
        retryCount,
        errorCode: errorCode || 'UNKNOWN',
        errorDetails,
        transactionId
      }
    );
  }, [errorMessage, errorDetails, errorCode, retryCount, transactionId]);

  // Determine error severity based on retry count
  const getErrorSeverity = (): 'low' | 'medium' | 'high' => {
    if (retryCount >= 3) return 'high';
    if (retryCount >= 2) return 'medium';
    return 'low';
  };

  // Get detailed message based on error
  const getDetailedMessage = () => {
    if (!errorCode) return null;
    
    switch (errorCode) {
      case 'CONNECTION_FAILURE':
        return 'לא הצלחנו להתחבר לשרת התשלומים. בדוק את החיבור לאינטרנט או נסה מאוחר יותר.';
      case 'PAYMENT_INIT_ERROR':
        return 'קרתה שגיאה בהכנת עמוד התשלום. נסה שנית או צור קשר עם התמיכה אם הבעיה נמשכת.';
      case 'SESSION_EXPIRED':
        return 'פג תוקף הפעולה. אנא נסה שוב.';
      case 'SERVER_ERROR':
        return 'השרת נתקל בשגיאה בעת עיבוד הבקשה. אנא נסה שוב מאוחר יותר.';
      default:
        return errorDetails || 'אירעה שגיאה בלתי צפויה. אנא נסה שוב או צור קשר עם התמיכה.';
    }
  };

  const severity = getErrorSeverity();
  const detailedMessage = getDetailedMessage();

  return (
    <div className="max-w-3xl mx-auto">
      {retryCount > 2 ? (
        <Card className="border-amber-200 dark:border-amber-800 shadow-md">
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
              code={errorCode || (retryCount > 3 ? "CONNECTION_FAILURE" : "PAYMENT_INIT_ERROR")}
              variant="destructive"
              showIcon={true}
              className="mb-6"
            />
            
            {detailedMessage && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-md">
                <p className="text-sm text-amber-800 dark:text-amber-300">{detailedMessage}</p>
              </div>
            )}
            
            {severity === 'high' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-md flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  אחרי מספר נסיונות כושלים, יתכן שיש בעיה במערכת התשלום. 
                  אנו מציעים לנסות שוב מאוחר יותר או ליצור קשר עם התמיכה.
                  {transactionId && (
                    <span className="block mt-2">
                      מזהה פעולה: <code className="bg-blue-100 dark:bg-blue-800/50 px-1 py-0.5 rounded">{transactionId}</code>
                    </span>
                  )}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 ml-2" />
                חזרה לבחירת תוכנית
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={onRetry}
                disabled={severity === 'high' && retryCount > 4}
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${severity === 'high' && retryCount > 4 ? '' : 'animate-spin'}`} />
                נסה שוב
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PaymentErrorBase
          message={errorMessage || "שגיאה בהכנת מסך התשלום"}
          onRetry={onRetry}
          onBack={onBack}
          errorDetails={errorDetails}
          errorCode={errorCode}
          transactionId={transactionId}
        />
      )}
    </div>
  );
};

export default SubscriptionPaymentError;
