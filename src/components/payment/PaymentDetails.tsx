
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface PaymentDetailsProps {
  terminalNumber: string;
  cardcomUrl: string;
  isReady?: boolean;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  terminalNumber,
  cardcomUrl,
  isReady = false
}) => {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">פרטי תשלום</h3>
          <p className="text-muted-foreground text-sm">אנא מלא/י את פרטי התשלום הבאים</p>
          
          {!isReady ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">טוען מערכת תשלום...</p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  מערכת התשלום מאובטחת על-ידי Cardcom
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  החיבור מאובטח ומוצפן SSL
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentDetails;
