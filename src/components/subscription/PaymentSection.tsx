
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreateSubscription } from '@/hooks/subscription/useCreateSubscription';
import { Loader2 } from 'lucide-react';

interface PaymentSectionProps {
  planId: string; // Keep as string to match existing implementation
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  planId, 
  onPaymentComplete, 
  onBack 
}) => {
  const { createSubscription, isLoading, isError, error } = useCreateSubscription({
    onSuccess: onPaymentComplete
  });

  const handleProcessPayment = () => {
    createSubscription(planId);
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>אישור תשלום</CardTitle>
          <CardDescription>
            אנא אשר/י את התשלום להפעלת המנוי שלך
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-center py-6">
            <p>לחיצה על כפתור האישור תעביר אותך למסך התשלום המאובטח</p>
            {isError && (
              <div className="text-red-500 py-2">
                {error?.message || 'אירעה שגיאה בעיבוד התשלום'}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            className="w-full" 
            disabled={isLoading}
            onClick={handleProcessPayment}
          >
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד תשלום...
              </span>
            ) : (
              'אישור תשלום'
            )}
          </Button>
          
          {onBack && (
            <Button 
              variant="outline" 
              onClick={onBack} 
              disabled={isLoading}
              className="w-full mt-2"
            >
              חזרה
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSection;
