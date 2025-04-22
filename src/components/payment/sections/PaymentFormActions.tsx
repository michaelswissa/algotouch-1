
import React from 'react';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { PaymentStatus, PaymentStatusType } from '../types/payment';

interface PaymentFormActionsProps {
  isSubmitting: boolean;
  paymentStatus: PaymentStatusType;
  operationType: 'token_only' | 'payment';
  onSubmit: () => void;
  onBack?: () => void;
  showPaymentButton: boolean;
  plan: {
    hasTrial?: boolean;
  };
}

const PaymentFormActions: React.FC<PaymentFormActionsProps> = ({
  isSubmitting,
  paymentStatus,
  operationType,
  onSubmit,
  onBack,
  showPaymentButton,
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
    <CardFooter className="flex flex-col space-y-2">
      {showPaymentButton && (
        <>
          <Button 
            type="button" 
            className="w-full" 
            onClick={onSubmit}
            disabled={isSubmitting || paymentStatus === PaymentStatus.PROCESSING}
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
    </CardFooter>
  );
};

export default PaymentFormActions;
