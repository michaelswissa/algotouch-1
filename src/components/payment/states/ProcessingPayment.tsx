
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProcessingPaymentProps {
  onCancel?: () => void;
  operationType?: 'payment' | 'token_only';
  planType?: string;
}

const ProcessingPayment: React.FC<ProcessingPaymentProps> = ({ 
  onCancel,
  operationType = 'payment'
}) => {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <h3 className="text-lg font-medium">
            {operationType === 'token_only' 
              ? 'מפעיל את המנוי...' 
              : 'מעבד את התשלום...'}
          </h3>
          <p className="text-muted-foreground">אנא המתן</p>
        </div>
      </div>
      
      {onCancel && (
        <Button 
          variant="outline" 
          onClick={onCancel} 
          className="mt-4"
        >
          ביטול
        </Button>
      )}
    </div>
  );
};

export default ProcessingPayment;
