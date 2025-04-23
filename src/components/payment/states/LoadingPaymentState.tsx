
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingPaymentStateProps {
  message?: string;
}

/**
 * A reusable component for displaying payment loading states
 * Used for both initializing and processing payment states
 */
const LoadingPaymentState: React.FC<LoadingPaymentStateProps> = ({ 
  message = 'אנא המתן, מעבד את התשלום...'
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p>{message}</p>
    </div>
  );
};

export default LoadingPaymentState;
