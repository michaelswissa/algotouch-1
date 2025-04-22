
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { PaymentStatus, PaymentStatusType } from '../types/payment';

interface PaymentFormHeaderProps {
  paymentStatus: PaymentStatusType;
  operationType: 'token_only' | 'payment';
}

const PaymentFormHeader: React.FC<PaymentFormHeaderProps> = ({ 
  paymentStatus, 
  operationType 
}) => {
  return (
    <CardHeader>
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <CardTitle>פרטי תשלום</CardTitle>
      </div>
      <CardDescription>
        {paymentStatus === PaymentStatus.SUCCESS 
          ? 'התשלום בוצע בהצלחה!'
          : operationType === 'token_only'
            ? 'הזן את פרטי כרטיס האשראי שלך להפעלת המנוי'
            : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
      </CardDescription>
    </CardHeader>
  );
};

export default PaymentFormHeader;
