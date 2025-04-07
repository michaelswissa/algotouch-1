
import React from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface PaymentErrorProps {
  onRetry: () => void;
  onBack: () => void;
}

const PaymentError: React.FC<PaymentErrorProps> = ({ onRetry, onBack }) => {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="text-center p-8 border-destructive/30 shadow-lg">
        <div className="flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <CardTitle>שגיאה בהכנת מסך התשלום</CardTitle>
          <CardDescription>אירעה שגיאה בעת הכנת מסך התשלום. אנא נסה שנית.</CardDescription>
          <Button onClick={onRetry} className="mt-2">נסה שנית</Button>
          <Button variant="outline" onClick={onBack} className="mt-2">חזור</Button>
        </div>
      </Card>
    </div>
  );
};

export default PaymentError;
