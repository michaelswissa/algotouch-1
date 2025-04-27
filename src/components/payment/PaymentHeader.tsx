
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { PlanType } from '@/types/payment';

interface PaymentHeaderProps {
  planId: PlanType;
}

const PaymentHeader: React.FC<PaymentHeaderProps> = ({ planId }) => {
  return (
    <CardHeader>
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <CardTitle>
          {planId === 'monthly' ? 'הפעלת תקופת ניסיון'
            : planId === 'annual' ? 'רכישת מנוי שנתי'
            : 'רכישת מנוי VIP'}
        </CardTitle>
      </div>
      <CardDescription>
        {planId === 'monthly' 
          ? 'הזן את פרטי כרטיס האשראי שלך להפעלת תקופת הניסיון' 
          : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
      </CardDescription>
    </CardHeader>
  );
};

export default PaymentHeader;
