
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FailedPaymentProps {
  onRetry: () => void;
  operationType?: 'payment' | 'token_only';
}

const FailedPayment: React.FC<FailedPaymentProps> = ({ onRetry, operationType = 'payment' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {operationType === 'token_only' 
          ? 'אימות כרטיס נכשל'
          : 'התשלום נכשל'}
      </h3>
      <p className="text-muted-foreground mb-4">
        {operationType === 'token_only'
          ? 'אירעה שגיאה באימות פרטי הכרטיס. אנא נסה שנית או פנה לתמיכה.'
          : 'אירעה שגיאה בעיבוד התשלום. אנא נסה שנית או פנה לתמיכה.'}
      </p>
      <Button variant="outline" onClick={onRetry} className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        נסה שנית
      </Button>
    </div>
  );
};

export default FailedPayment;
