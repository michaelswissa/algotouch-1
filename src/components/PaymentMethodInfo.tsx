
import React from 'react';
import { CreditCard, CreditCardIcon } from 'lucide-react';

interface PaymentMethodProps {
  paymentMethod: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
    brand?: string;
  } | null;
}

const PaymentMethodInfo: React.FC<PaymentMethodProps> = ({ paymentMethod }) => {
  if (!paymentMethod) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
          <CreditCardIcon className="h-5 w-5 text-primary" />
          <div>
            <h4 className="text-sm font-medium">אמצעי תשלום</h4>
            <p className="text-sm text-muted-foreground">לא נמצאו פרטי תשלום</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
        <CreditCard className="h-5 w-5 text-primary" />
        <div>
          <h4 className="text-sm font-medium">אמצעי תשלום</h4>
          <p className="text-sm text-muted-foreground">
            {paymentMethod.brand ? `${paymentMethod.brand} ` : ''}
            •••• {paymentMethod.lastFourDigits} | {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodInfo;
