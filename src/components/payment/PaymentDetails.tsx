
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CreditCard } from 'lucide-react';
import SecurityNote from './SecurityNote';

const PaymentDetails: React.FC = () => {
  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-center text-muted-foreground">
        זוהי גרסת תצוגה מקדימה של טופס התשלום. כדי להזין פרטי תשלום אמיתיים, 
        אנא לחצו על הכפתור "מעבר לדף התשלום" למטה והשלימו את התשלום במערכת הסליקה המאובטחת.
      </p>
      
      <div className="space-y-2">
        <Label htmlFor="cardOwnerName">שם בעל הכרטיס</Label>
        <Input
          id="cardOwnerName"
          placeholder="ישראל ישראלי"
          disabled
          className="bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardNumber">מספר כרטיס</Label>
        <div className="relative">
          <Input 
            id="cardNumber"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            disabled
            className="bg-muted"
          />
          <div className="absolute top-0 right-0 h-full flex items-center pr-3">
            <CreditCard className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex space-x-4 space-x-reverse">
        <div className="space-y-2 w-1/2">
          <Label htmlFor="expiry">תוקף</Label>
          <Input
            id="expiry"
            placeholder="MM/YY"
            disabled
            className="bg-muted"
          />
        </div>
        <div className="space-y-2 w-1/2">
          <Label htmlFor="cvv">קוד אבטחה</Label>
          <Input
            id="cvv"
            placeholder="CVV"
            disabled
            className="bg-muted"
          />
        </div>
      </div>

      <SecurityNote />
    </div>
  );
};

export default PaymentDetails;
