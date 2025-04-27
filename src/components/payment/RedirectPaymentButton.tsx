
import React, { useState, useCallback } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRedirectPayment } from '@/hooks/payment/useRedirectPayment';
import { toast } from 'sonner';

interface RedirectPaymentButtonProps extends ButtonProps {
  planId: string;
  amount: number;
  userEmail: string;
  fullName: string;
  buttonText?: string;
  loadingText?: string;
}

const RedirectPaymentButton: React.FC<RedirectPaymentButtonProps> = ({
  planId,
  amount,
  userEmail,
  fullName,
  buttonText = 'עבור לתשלום',
  loadingText = 'מכין את עמוד התשלום...',
  ...buttonProps
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { createRedirectPayment, redirectToPayment } = useRedirectPayment({
    onSuccess: (data) => {
      if (data?.url) {
        redirectToPayment(data.url);
      } else {
        toast.error('לא התקבלה כתובת תשלום תקינה');
        setIsProcessing(false);
      }
    },
    onError: () => {
      setIsProcessing(false);
    }
  });

  const handlePaymentClick = useCallback(async () => {
    if (!userEmail) {
      toast.error('נדרשת כתובת דוא"ל לביצוע התשלום');
      return;
    }

    setIsProcessing(true);
    await createRedirectPayment({ planId, amount, userEmail, fullName });
  }, [planId, amount, userEmail, fullName, createRedirectPayment]);

  return (
    <Button
      onClick={handlePaymentClick}
      disabled={isProcessing}
      className="w-full"
      {...buttonProps}
    >
      {isProcessing ? (
        <span className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </span>
      ) : (
        buttonText
      )}
    </Button>
  );
};

export default RedirectPaymentButton;
