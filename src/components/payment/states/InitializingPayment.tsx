
import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface InitializingPaymentProps {
  error?: string | null;
}

const InitializingPayment: React.FC<InitializingPaymentProps> = ({ error }) => {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
        </div>
        <p className="text-sm mb-2">אירעה שגיאה באתחול תהליך התשלום:</p>
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p>אנא המתן, מאתחל תהליך תשלום...</p>
    </div>
  );
};

export default InitializingPayment;
