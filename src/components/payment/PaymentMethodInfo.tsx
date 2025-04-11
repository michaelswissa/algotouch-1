
import React from 'react';
import { CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentMethodInfoProps {
  paymentMethod: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
  } | null;
  onUpdate?: () => void;
}

const PaymentMethodInfo: React.FC<PaymentMethodInfoProps> = ({ 
  paymentMethod, 
  onUpdate 
}) => {
  if (!paymentMethod) {
    return (
      <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
        <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium">אמצעי תשלום</h4>
          <p className="text-sm text-muted-foreground">לא נמצאו פרטי אמצעי תשלום</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
      <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
      <div className="flex-1">
        <h4 className="text-sm font-medium">אמצעי תשלום</h4>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">כרטיס אשראי</span> מסתיים ב-{paymentMethod.lastFourDigits} &bull; תוקף {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
          </p>
          {onUpdate && (
            <Button variant="ghost" size="sm" className="h-8" onClick={onUpdate}>
              <ExternalLink className="h-4 w-4 mr-1" />
              עדכון
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodInfo;
