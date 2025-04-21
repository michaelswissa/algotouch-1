
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface FailedPaymentProps {
  errorMessage?: string;
  onRetry: () => void;
}

const FailedPayment: React.FC<FailedPaymentProps> = ({ 
  errorMessage = 'אירעה שגיאה בתהליך התשלום. אנא נסה שוב או צור קשר עם התמיכה.',
  onRetry 
}) => {
  return (
    <div className="text-center py-6 space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold">התשלום נכשל</h3>
          <p className="text-muted-foreground mt-1 max-w-xs mx-auto">
            {errorMessage}
          </p>
        </div>
      </div>
      
      <Button 
        onClick={onRetry} 
        className="w-full"
      >
        נסה שוב
      </Button>
      
      <p className="text-xs text-muted-foreground">
        אם אתה ממשיך להיתקל בבעיות, אנא צור קשר עם התמיכה.
      </p>
    </div>
  );
};

export default FailedPayment;
