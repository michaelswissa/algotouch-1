import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
  
  useEffect(() => {
    const startTime = Date.now();
    let progressInterval: NodeJS.Timeout;
    let messageInterval: NodeJS.Timeout;
    
    const maxProcessingTime = operationType === 'token_only' ? 30000 : 60000;
    
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(Math.floor((elapsed / maxProcessingTime) * 100), 95);
      setProgress(newProgress);
      setElapsedTime(Math.floor(elapsed / 1000));
    }, 300);
    
    messageInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (operationType === 'token_only') {
        if (elapsed < 5000) {
          setMessage('מאמת את פרטי הכרטיס...');
        } else if (elapsed < 15000) {
          setMessage('יוצר אסימון לחיוב עתידי...');
        } else {
          setMessage('ממתין לאישור מחברת האשראי...');
        }
      } else {
        if (elapsed < 5000) {
          setMessage('מעבד את פרטי התשלום...');
        } else if (elapsed < 15000) {
          setMessage('שולח את העסקה לחברת האשראי...');
        } else if (elapsed < 30000) {
          setMessage('ממתין לאישור מחברת האשראי...');
        } else {
          setMessage('הפעולה נמשכת זמן רב מהרגיל, אנא המתן...');
        }
      }
    }, 5000);
    
    setMessage(operationType === 'token_only' ? 'מאמת את פרטי הכרטיס...' : 'מעבד את פרטי התשלום...');
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [operationType]);
  
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
          {elapsedTime > 20 && (
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
          indicatorClassName={progress > 80 ? "bg-amber-500" : undefined}
        />
      </div>
      
      {onCancel && elapsedTime > 30 && (
        <Button 
          variant="outline" 
          onClick={onCancel} 
          className="mt-4"
        >
          ביטול
        </Button>
      )}
      
      {elapsedTime > 45 && (
        <p className="text-xs text-muted-foreground">
          {operationType === 'token_only'
            ? 'יצירת האסימון נמשכת זמן רב מהרגיל. אם התהליך יימשך עוד זמן רב, באפשרותך לבטל ולנסות שנית.'
            : 'עיבוד התשלום נמשך זמן רב מהרגיל. אם התהליך יימשך עוד זמן רב, באפשרותך לבטל ולנסות שנית.'}
        </p>
      )}
    </div>
  );
};

export default ProcessingPayment;
