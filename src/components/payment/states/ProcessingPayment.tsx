
import React, { useState, useEffect } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProcessingPaymentProps {
  onCancel?: () => void;
}

const ProcessingPayment: React.FC<ProcessingPaymentProps> = ({ onCancel }) => {
  const [processingTime, setProcessingTime] = useState(0);
  const [showCancelOption, setShowCancelOption] = useState(false);
  
  // Show cancel option after 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setProcessingTime(prev => prev + 1);
      
      if (processingTime >= 10 && !showCancelOption) {
        setShowCancelOption(true);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [processingTime, showCancelOption]);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p>מעבד את התשלום, אנא המתן...</p>
      <p className="text-sm text-muted-foreground mt-2">אל תסגור את החלון זה</p>
      
      {showCancelOption && onCancel && (
        <div className="mt-6">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 text-destructive"
            onClick={onCancel}
          >
            <XCircle className="h-4 w-4" />
            ביטול העסקה
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            לתשומת לבך: ביטול כעת לא יבטיח שהעסקה לא תושלם
          </p>
        </div>
      )}
    </div>
  );
};

export default ProcessingPayment;
