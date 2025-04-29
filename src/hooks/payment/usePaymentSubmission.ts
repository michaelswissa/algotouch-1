
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

  const submitPayment = useCallback(() => {
    if (isSubmitting) {
      console.log('Payment submission already in progress');
      return;
    }
    
    if (!lowProfileCode) {
      toast.error("חסר מזהה יחודי לעסקה, אנא נסה/י שנית");
      return;
    }
    
    setIsSubmitting(true);
    PaymentLogger.log('Submitting payment transaction with CardCom 3DS');

    try {
      // Validate that required user fields are filled
      const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
      const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
      
      // Validate user input fields
      if (!cardholderName) {
        toast.error("נא להזין שם בעל כרטיס");
        setIsSubmitting(false);
        return;
      }
      
      if (!cardOwnerId || cardOwnerId.length !== 9) {
        toast.error("תעודת זהות חייבת להכיל 9 ספרות");
        setIsSubmitting(false);
        return;
      }
      
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        toast.error("נא להזין כתובת אימייל תקינה");
        setIsSubmitting(false);
        return;
      }
      
      if (!phone || !/^0\d{8,9}$/.test(phone.replace(/[-\s]/g, ''))) {
        toast.error("נא להזין מספר טלפון תקין");
        setIsSubmitting(false);
        return;
      }

      // Update payment status
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatusEnum.PROCESSING
      }));

      // Check if the CardCom 3DS script is available
      if (window.cardcom3DS) {
        PaymentLogger.log('Using CardCom 3DS to process payment', { lowProfileCode });
        
        // Validate fields first
        const isValid = window.cardcom3DS.validateFields();
        
        if (isValid) {
          // Process the payment using the cardcom3DS global object
          window.cardcom3DS.doPayment(lowProfileCode);
          PaymentLogger.log('Payment request sent to CardCom 3DS');
        } else {
          PaymentLogger.error('CardCom 3DS field validation failed');
          toast.error("אנא וודא שפרטי כרטיס האשראי הוזנו כראוי");
          setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.IDLE }));
          setIsSubmitting(false);
        }
      } else {
        PaymentLogger.error('CardCom 3DS script not available');
        toast.error("שגיאה בטעינת מערכת הסליקה, אנא רענן את הדף ונסה שנית");
        setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.FAILED }));
        setIsSubmitting(false);
      }
      
      // Reset submission state after a delay
      setTimeout(() => {
        setIsSubmitting(false);
      }, 5000);
    } catch (error) {
      PaymentLogger.error("Error submitting payment:", error);
      toast.error("שגיאה בשליחת פרטי התשלום");
      setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.FAILED }));
      setIsSubmitting(false);
    }
  }, [lowProfileCode, terminalNumber, operationType, setState, isSubmitting, onPaymentComplete]);

  return {
    isSubmitting,
    submitPayment
  };
};
