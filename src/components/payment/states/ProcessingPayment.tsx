
import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isExtendedTime, setIsExtendedTime] = useState(false);
  
  // Update progress and messages
  useEffect(() => {
    const startTime = Date.now();
    let progressInterval: NodeJS.Timeout;
    let messageInterval: NodeJS.Timeout;
    
    // Different timing based on operation type
    const maxProcessingTime = operationType === 'token_only' ? 90000 : 120000; 
    
    // Set up progress bar animation
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Calculate progress - slow down progress as time passes to avoid reaching 100%
      let newProgress;
      if (elapsed < maxProcessingTime * 0.5) {
        // First half - progress normally
        newProgress = Math.min(Math.floor((elapsed / maxProcessingTime) * 80), 75);
      } else if (elapsed < maxProcessingTime * 0.8) {
        // Later stage - slow down progress
        newProgress = 75 + Math.min(Math.floor(((elapsed - (maxProcessingTime * 0.5)) / maxProcessingTime) * 15), 15);
      } else {
        // Final stage - barely move
        newProgress = 90 + Math.min(Math.floor(((elapsed - (maxProcessingTime * 0.8)) / maxProcessingTime) * 5), 5);
      }
      
      setProgress(newProgress);
      setElapsedTime(Math.floor(elapsed / 1000));
      
      // Show warning if taking too long
      if (elapsed > 25000 && !showWarning) {
        setShowWarning(true);
      }
      
      // Show extended time message
      if (elapsed > 60000 && !isExtendedTime) {
        setIsExtendedTime(true);
      }
      
    }, 200);
    
    // Update messages based on elapsed time
    messageInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (operationType === 'token_only') {
        if (elapsed < 3000) {
          setMessage('שולח פרטי כרטיס לבדיקה...');
        } else if (elapsed < 8000) {
          setMessage('יוצר אסימון לחיוב עתידי...');
        } else if (elapsed < 15000) {
          setMessage('ממתין לאישור מחברת האשראי...');
        } else if (elapsed < 25000) {
          setMessage('מעבד את פרטי ההרשאה...');
        } else if (elapsed < 40000) {
          setMessage('התהליך לוקח יותר זמן מהרגיל, אנא המתן...');
        } else if (elapsed < 60000) {
          setMessage('ממתין לאישור סופי מחברת האשראי...');
        } else {
          setMessage('התהליך מורכב ולוקח זמן, עדיין מעבד...');
        }
      } else {
        if (elapsed < 3000) {
          setMessage('שולח פרטי תשלום...');
        } else if (elapsed < 8000) {
          setMessage('מעבד את העסקה מול חברת האשראי...');
        } else if (elapsed < 15000) {
          setMessage('ממתין לאישור העסקה...');
        } else if (elapsed < 25000) {
          setMessage('העסקה בתהליך אימות...');
        } else if (elapsed < 40000) {
          setMessage('העסקה עדיין בעיבוד, אנא המתן...');
        } else if (elapsed < 60000) {
          setMessage('ממתין לאישור סופי מחברת האשראי...');
        } else {
          setMessage('התהליך מורכב ולוקח זמן, אנא המשך להמתין...');
        }
      }
    }, 3000);
    
    // Initial message
    setMessage(operationType === 'token_only' ? 'מפעיל את המנוי...' : 'מעבד את התשלום...');
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [operationType, showWarning, isExtendedTime]);
  
  const handleCancel = () => {
    if (onCancel) {
      // Log cancellation for debugging
      console.log("User manually cancelled payment process", { 
        elapsedTime, 
        operationType, 
        planType 
      });
      onCancel();
    }
  };
  
  return (
    <div className="text-center py-10 space-y-6">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div>
          <h3 className="text-lg font-medium mb-1">
            {operationType === 'token_only' 
              ? 'מפעיל את המנוי...' 
              : 'מעבד את התשלום...'}
          </h3>
          <p className="text-muted-foreground">{message}</p>
          {elapsedTime > 5 && (
            <p className="text-sm text-muted-foreground mt-1">
              {`זמן עיבוד: ${elapsedTime} שניות`}
            </p>
          )}
        </div>
      </div>
      
      <div className="w-full">
        <Progress 
          value={progress} 
          className="w-full h-2" 
          indicatorClassName={progress > 85 ? "bg-amber-500" : undefined}
        />
      </div>
      
      {showWarning && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="mr-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {operationType === 'token_only'
                  ? 'יצירת ההרשאה לוקחת זמן'
                  : 'עיבוד התשלום לוקח זמן'}
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                <p>
                  {isExtendedTime 
                    ? 'תהליך הרישום לוקח זמן רב מהצפוי. ניתן להמתין או לבטל ולנסות שנית.' 
                    : 'אנחנו עדיין מעבדים את הבקשה. אנא המתן.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {elapsedTime > 15 && (
        <Button 
          variant="outline" 
          onClick={handleCancel} 
          className="mt-4"
        >
          ביטול וניסיון מחדש
        </Button>
      )}
    </div>
  );
};

export default ProcessingPayment;
