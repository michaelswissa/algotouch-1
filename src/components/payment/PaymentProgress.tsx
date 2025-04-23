
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { PaymentStatus } from './types/payment';
import { Loader2 } from 'lucide-react';

interface PaymentProgressProps {
  status: PaymentStatus;
  attempt: number;
  timeoutStage?: number;
  showProgress?: boolean;
  isRealtimeConnected?: boolean;
}

export const PaymentProgress: React.FC<PaymentProgressProps> = ({ 
  status, 
  attempt,
  timeoutStage = 0,
  showProgress = true,
  isRealtimeConnected
}) => {
  // Don't show progress for non-processing states
  if (status !== PaymentStatus.PROCESSING) {
    return null;
  }

  // Calculate progress percentage based on attempts
  // Cap at 95% to indicate it's not complete
  const progress = Math.min((attempt / 30) * 100, 95);
  
  // Determine indicator color based on timeout stage
  const getIndicatorClassName = () => {
    if (timeoutStage >= 2) return "bg-amber-500";
    if (timeoutStage >= 1) return "bg-yellow-400";
    return undefined;
  };
  
  // Get the appropriate message based on the attempt count and timeout stage
  const getMessage = () => {
    if (timeoutStage >= 2) return 'עיבוד התשלום נמשך זמן רב מהרגיל, מנסה שוב...';
    if (timeoutStage >= 1) return 'עיבוד התשלום נמשך זמן רב, אנא המתן...';
    if (attempt > 20) return 'עיבוד התשלום נמשך יותר מהרגיל. אנא המתן...';
    if (attempt > 10) return 'ממתין לאישור מחברת האשראי...';
    if (attempt > 5) return 'מעבד את העסקה...';
    return 'מעבד את פרטי התשלום...';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 justify-center mb-1">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">מעבד תשלום</span>
        {isRealtimeConnected !== undefined && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
            {isRealtimeConnected ? 'מחובר' : 'מתחבר...'}
          </span>
        )}
      </div>
      
      {showProgress && (
        <Progress 
          value={progress} 
          className="w-full h-2" 
          indicatorClassName={getIndicatorClassName()}
        />
      )}
      
      <p className="text-sm text-muted-foreground text-center">
        {getMessage()}
        {timeoutStage >= 1 && attempt > 15 && (
          <span className="block text-xs mt-1">
            בוצעו {attempt} נסיונות
          </span>
        )}
      </p>
    </div>
  );
};
