
import React from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';

const PaymentLoading: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="text-center p-8 border-primary/30 shadow-lg">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-16 w-16 rounded-full border-4 border-t-primary animate-spin"></div>
          <CardTitle className="text-2xl">מכין את מסך התשלום...</CardTitle>
          <CardDescription className="text-lg">אנא המתן, אנחנו מכינים את טופס התשלום המאובטח</CardDescription>
        </div>
      </Card>
    </div>
  );
};

export default PaymentLoading;
