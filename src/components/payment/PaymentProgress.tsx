
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { PaymentStatus } from './types/payment';

interface PaymentProgressProps {
  status: PaymentStatus;
  attempt: number;
  showProgress?: boolean;
}

export const PaymentProgress: React.FC<PaymentProgressProps> = ({ 
  status, 
  attempt,
  showProgress = true 
}) => {
  const progress = Math.min((attempt / 30) * 100, 95);
  
  if (status !== PaymentStatus.PROCESSING) {
    return null;
  }

  return (
    <div className="space-y-2">
      {showProgress && (
        <Progress 
          value={progress} 
          className="w-full h-2" 
          indicatorClassName={progress > 80 ? "bg-amber-500" : undefined}
        />
      )}
      <p className="text-sm text-muted-foreground text-center">
        {attempt > 20 
          ? 'עיבוד התשלום נמשך זמן רב מהרגיל. אנא המתן...'
          : 'מעבד את התשלום...'}
      </p>
    </div>
  );
};
