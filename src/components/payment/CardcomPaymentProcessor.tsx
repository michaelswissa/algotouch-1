
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { payWithCardcom } from '@/lib/payment/cardcom-service';
import { Spinner } from '@/components/ui/spinner';

interface PaymentProcessorProps {
  planId: string;
  amount: number;
  planName: string;
  fullName: string;
  email: string;
  phone?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const CardcomPaymentProcessor: React.FC<PaymentProcessorProps> = ({
  planId,
  amount,
  planName,
  fullName,
  email,
  phone,
  onSuccess,
  onError
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לבצע רכישה",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await payWithCardcom({
        userId: user.id,
        planId,
        fullName,
        email,
        phone,
        amount,
        description: `AlgoTouch - ${planName}`,
        currency: 'ILS',
        language: 'he'
      });

      if (!result.success) {
        setIsProcessing(false);
        toast({
          title: "שגיאה בתהליך התשלום",
          description: result.error || "אירעה שגיאה בלתי צפויה",
          variant: "destructive",
        });
        if (onError) onError(result.error || "Unknown error");
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "שגיאה בתהליך התשלום",
        description: error.message || "אירעה שגיאה בלתי צפויה",
        variant: "destructive",
      });
      if (onError) onError(error.message || "Unknown error");
    }
  };

  return (
    <div className="mt-4">
      <Button
        className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700"
        onClick={handlePayment}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2 space-x-reverse">
            <Spinner className="w-5 h-5" />
            <span>מעבר לעמוד התשלום...</span>
          </div>
        ) : (
          <span>המשך לתשלום מאובטח</span>
        )}
      </Button>
      <div className="mt-2 text-sm text-center text-muted-foreground">
        התשלום מאובטח באמצעות CardCom
      </div>
    </div>
  );
};

export default CardcomPaymentProcessor;
