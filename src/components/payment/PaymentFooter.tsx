
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PaymentStatus } from './types/payment';

interface PaymentFooterProps {
  paymentStatus: string;
  operationType?: 'payment' | 'token_only';
  isSubmitting: boolean;
  isInitializing: boolean;
  isContentReady: boolean;
  onSubmit: () => void;
  onBack?: () => void;
  plan: { hasTrial: boolean };
}

const PaymentFooter: React.FC<PaymentFooterProps> = ({
  paymentStatus,
  operationType,
  isSubmitting,
  isInitializing,
  isContentReady,
  onSubmit,
  onBack,
  plan
}) => {
  const getButtonText = () => {
    if (isSubmitting || paymentStatus === PaymentStatus.PROCESSING) {
      return operationType === 'token_only' 
        ? <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מפעיל מנוי...</span>
        : <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד תשלום...</span>;
    }
    return operationType === 'token_only' ? 'אשר והפעל מנוי' : 'אשר תשלום';
  };

  return (
    <div className="flex flex-col space-y-2">
      {(paymentStatus === PaymentStatus.IDLE || paymentStatus === PaymentStatus.PROCESSING) && !isInitializing && (
        <>
          <Button 
            type="button" 
            className="w-full" 
            onClick={onSubmit}
            disabled={isSubmitting || paymentStatus === PaymentStatus.PROCESSING || !isContentReady}
          >
            {getButtonText()}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {operationType === 'token_only' 
              ? 'החיוב הראשון יבוצע בתום תקופת הניסיון' 
              : plan.hasTrial 
                ? 'לא יבוצע חיוב במהלך תקופת הניסיון' 
                : 'החיוב יבוצע מיידית'}
          </p>
        </>
      )}
      
      {onBack && paymentStatus !== PaymentStatus.SUCCESS && (
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="absolute top-4 right-4"
          disabled={isSubmitting || paymentStatus === PaymentStatus.PROCESSING}
        >
          חזור
        </Button>
      )}
    </div>
  );
};

export default PaymentFooter;
