
import React from 'react';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProcessingPaymentProps {
  onCancel?: () => void;
  operationType?: 'payment' | 'token_only';
  planType?: string;
}

const ProcessingPayment: React.FC<ProcessingPaymentProps> = ({ onCancel, operationType, planType }) => {
  const loadingMessage = operationType === 'token_only' 
    ? 'מיצר אסימון למנוי שלך...' 
    : 'מעבד את התשלום...';
    
  const subMessage = operationType === 'token_only'
    ? 'אנו מצירים אסימון מאובטח לחיוב בתום תקופת הניסיון'
    : 'אנא המתן בזמן שאנו מעבדים את העסקה שלך';

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
      <h3 className="text-xl font-semibold mb-2">{loadingMessage}</h3>
      <p className="text-muted-foreground mb-6">
        {subMessage}
      </p>
      
      {planType === 'monthly' && (
        <p className="text-xs text-muted-foreground mb-6">
          התשלום המלא יגבה רק בתום תקופת הניסיון ({operationType === 'token_only' ? '7 ימים' : '14 ימים'})
        </p>
      )}
      
      {onCancel && (
        <Button 
          variant="ghost" 
          onClick={onCancel} 
          className="flex items-center gap-1"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          בטל תשלום
        </Button>
      )}
    </div>
  );
};

export default ProcessingPayment;
