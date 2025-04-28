
import { useState, useCallback } from 'react';
import { PaymentStatusEnum } from '@/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';

interface UsePaymentSubmissionProps {
  lowProfileCode: string;
  terminalNumber: string;
  operationType: 'payment' | 'token_only';
  setState: (state: any) => void;
  onPaymentComplete?: () => void;
}

export const usePaymentSubmission = ({
  lowProfileCode,
  terminalNumber,
  operationType,
  setState,
  onPaymentComplete
}: UsePaymentSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitPayment = useCallback((masterFrameRef: React.RefObject<HTMLIFrameElement>) => {
    if (isSubmitting) {
      console.log('Payment submission already in progress');
      return;
    }
    
    if (!lowProfileCode) {
      toast.error("חסר מזהה יחודי לעסקה, אנא נסה/י שנית");
      return;
    }
    
    if (!masterFrameRef.current?.contentWindow) {
      toast.error("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
      return;
    }
    
    setIsSubmitting(true);
    PaymentLogger.log('Submitting payment transaction');

    try {
      const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
      const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
      const expirationMonth = document.querySelector<HTMLSelectElement>('select[name="expirationMonth"]')?.value || '';
      const expirationYear = document.querySelector<HTMLSelectElement>('select[name="expirationYear"]')?.value || '';
      
      const externalUniqTranId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const formData = {
        action: 'doTransaction',
        cardOwnerName: cardholderName,
        cardOwnerId,
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth,
        expirationYear,
        numberOfPayments: "1",
        ExternalUniqTranId: externalUniqTranId,
        TerminalNumber: terminalNumber,
        Operation: operationType === 'token_only' ? "ChargeAndCreateToken" : "ChargeOnly",
        lowProfileCode,
        LowProfileCode: lowProfileCode,
        Document: {
          Name: cardholderName || email,
          Email: email,
          TaxId: cardOwnerId,
          Phone: phone,
          DocumentTypeToCreate: "Receipt"
        }
      };

      PaymentLogger.log('Sending transaction data to CardCom:', formData);
      masterFrameRef.current.contentWindow.postMessage(formData, '*');
      
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatusEnum.PROCESSING
      }));
      
      setTimeout(() => {
        setIsSubmitting(false);
      }, 5000);
    } catch (error) {
      PaymentLogger.error("Error submitting payment:", error);
      toast.error("שגיאה בשליחת פרטי התשלום");
      setIsSubmitting(false);
    }
  }, [lowProfileCode, terminalNumber, operationType, setState, isSubmitting]);

  return {
    isSubmitting,
    submitPayment
  };
};
