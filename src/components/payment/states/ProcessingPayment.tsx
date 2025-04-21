
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProcessingPaymentProps {
  onCancel?: () => void;
}

const ProcessingPayment: React.FC<ProcessingPaymentProps> = ({ onCancel }) => {
  const [processingTime, setProcessingTime] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const MAX_PROCESSING_TIME = 180; // 3 minutes in seconds
  
  // Update processing time and progress
  useEffect(() => {
    const timer = setInterval(() => {
      setProcessingTime(prev => {
        const newTime = prev + 1;
        // Cap at maximum processing time
        return newTime <= MAX_PROCESSING_TIME ? newTime : MAX_PROCESSING_TIME;
      });
      
      setProgressValue(prev => {
        // Calculate progress percentage (0-100)
        const newProgress = (processingTime / MAX_PROCESSING_TIME) * 100;
        return Math.min(newProgress, 99); // Never reach 100% until complete
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [processingTime]);

  // Get appropriate message based on processing time
  const getStatusMessage = () => {
    if (processingTime < 15) {
      return "מעבד את התשלום, אנא המתן...";
    } else if (processingTime < 30) {
      return "מאמת פרטים מול חברת האשראי...";
    } else if (processingTime < 60) {
      return "ממתין לאישור העסקה...";
    } else if (processingTime < 90) {
      return "העסקה עדיין בבדיקה, אנא המתן...";
    } else {
      return "הבדיקה נמשכת זמן רב מהרגיל, אנא המתן...";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
      <p className="font-medium">{getStatusMessage()}</p>
      
      <div className="w-full max-w-md">
        <Progress value={progressValue} className="h-2" />
      </div>
      
      <p className="text-sm text-muted-foreground">
        העסקה מאומתת מול חברת האשראי, התהליך עשוי להימשך מספר רגעים
      </p>
      <p className="text-xs text-muted-foreground">אל תסגור את החלון זה</p>
    </div>
  );
};

export default ProcessingPayment;
