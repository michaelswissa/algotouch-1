
import React from 'react';
import { CreditCard } from 'lucide-react';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { PaymentStatus } from './types/payment';

interface PaymentHeaderProps {
  paymentStatus: string;
  operationType?: 'payment' | 'token_only';
}

const PaymentHeader: React.FC<PaymentHeaderProps> = ({ 
  paymentStatus, 
  operationType 
}) => {
  return (
    <div>
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
    </div>
  );
};

export default PaymentHeader;
