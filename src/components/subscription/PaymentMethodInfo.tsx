
import React from 'react';
import { CreditCard } from 'lucide-react';

interface PaymentMethod {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
}

interface PaymentMethodInfoProps {
  paymentMethod: PaymentMethod | null;
}

const PaymentMethodInfo: React.FC<PaymentMethodInfoProps> = ({ paymentMethod }) => {
  if (!paymentMethod) return null;
  
  return (
    <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
      <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
      <div>
        <h4 className="text-sm font-medium">אמצעי תשלום</h4>
        <p className="text-sm text-muted-foreground">
          כרטיס אשראי המסתיים ב-{paymentMethod.lastFourDigits} (תוקף: {paymentMethod.expiryMonth}/{paymentMethod.expiryYear.slice(-2)})
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodInfo;
