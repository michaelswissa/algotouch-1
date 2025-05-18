
import React from 'react';
import { CreditCard } from 'lucide-react';
import { PaymentMethod } from '@/services/subscription/types';

interface PaymentMethodInfoProps {
  paymentMethod: PaymentMethod | null;
}

const PaymentMethodInfo: React.FC<PaymentMethodInfoProps> = ({ paymentMethod }) => {
  if (!paymentMethod || !paymentMethod.lastFourDigits) {
    return (
      <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
        <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium">אמצעי תשלום</h4>
          <p className="text-sm text-muted-foreground">אין נתונים זמינים</p>
        </div>
      </div>
    );
  }

  const { lastFourDigits, expiryMonth, expiryYear } = paymentMethod;
  
  return (
    <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
      <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
      <div>
        <h4 className="text-sm font-medium">אמצעי תשלום</h4>
        <p className="text-sm text-muted-foreground">
          כרטיס אשראי המסתיים ב-{lastFourDigits || '****'} 
          {expiryMonth && expiryYear ? ` (בתוקף עד ${expiryMonth}/${expiryYear})` : ''}
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodInfo;
