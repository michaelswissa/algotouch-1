
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProcessingPaymentProps {
  onCancel?: () => void;
  operationType?: 'payment' | 'token_only';
  planType?: string;
}

const ProcessingPayment: React.FC<ProcessingPaymentProps> = ({ 
  onCancel, 
  operationType = 'payment',
  planType
}) => {
  const [processingTime, setProcessingTime] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  
  // Set different max times based on operation type
  const MAX_PROCESSING_TIME = operationType === 'token_only' ? 45 : 180; // seconds
  
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
  }, [processingTime, MAX_PROCESSING_TIME]);

  // Get appropriate message based on processing time and operation type
  const getStatusMessage = () => {
    // Token creation specific messages
    if (operationType === 'token_only') {
      if (planType === 'monthly') {
        if (processingTime < 10) {
          return "יוצר אסימון למנוי חודשי...";
        } else if (processingTime < 20) {
          return "מאמת פרטי כרטיס אשראי...";
        } else {
          return "ממתין לאישור יצירת האסימון...";
        }
      } else {
        if (processingTime < 10) {
          return "יוצר אסימון לשימוש עתידי...";
        } else {
          return "ממתין לאישור יצירת האסימון...";
        }
      }
    }
    
    // Regular payment messages
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

  // Get secondary message based on operation type
  const getSecondaryMessage = () => {
    if (operationType === 'token_only') {
      if (planType === 'monthly') {
        return "אנו יוצרים אסימון מאובטח לצורך חיובים חודשיים עתידיים";
      } else {
        return "יצירת אסימון מאובטח לשימוש עתידי";
      }
    } else {
      return "העסקה מאומתת מול חברת האשראי, התהליך עשוי להימשך מספר רגעים";
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
        {getSecondaryMessage()}
      </p>
      <p className="text-xs text-muted-foreground">אל תסגור את החלון זה</p>
    </div>
  );
};

export default ProcessingPayment;
