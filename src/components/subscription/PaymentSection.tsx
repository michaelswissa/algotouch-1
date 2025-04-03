
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

interface PaymentSectionProps {
  selectedPlan: string;
  onPaymentComplete: () => void;
  onBack: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  selectedPlan,
  onPaymentComplete,
  onBack
}) => {
  return (
    <div>
      <Card className="max-w-lg mx-auto" dir="rtl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>תשלום</CardTitle>
          </div>
          <CardDescription>מערכת התשלום נמצאת בפיתוח</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center py-6">
            מערכת התשלום שלנו נמצאת בתהליכי שדרוג. 
            אנו עובדים על שילוב מערכת קארדקום לסליקה בטוחה.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            חזור
          </Button>
          <Button onClick={onPaymentComplete}>
            המשך לשלב הבא
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSection;
