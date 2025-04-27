
import { useState } from 'react';
import { toast } from 'sonner';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UsePaymentSubmissionProps {
  submitPayment: () => void;
  setState: (updater: any) => void;
  lowProfileCode: string;
}

export const usePaymentSubmission = ({ 
  submitPayment, 
  setState, 
  lowProfileCode 
}: UsePaymentSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitPayment = () => {
    const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value;
    const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value;
    
    if (!cardholderName) {
      toast.error('יש למלא את שם בעל הכרטיס');
      return;
    }

    if (!cardOwnerId || !/^\d{9}$/.test(cardOwnerId)) {
      toast.error('יש למלא תעודת זהות תקינה');
      return;
    }

    const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value;
    if (!email) {
      toast.error('יש למלא כתובת דואר אלקטרוני');
      return;
    }

    const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value;
    if (!phone) {
      toast.error('יש למלא מספר טלפון');
      return;
    }
    
    if (!lowProfileCode) {
      toast.error('חסר מזהה עסקה');
      return;
    }

    setIsSubmitting(true);
    
    try {
      submitPayment();
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
      
      setTimeout(() => {
        setIsSubmitting(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('אירעה שגיאה בשליחת התשלום');
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleSubmitPayment
  };
};
