
import { useState } from 'react';
import { toast } from 'sonner';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UsePaymentSubmissionProps {
  submitPayment: () => void;
  setState: (updater: any) => void;
  lowProfileCode: string;
  planId: string;
}

export const usePaymentSubmission = ({ 
  submitPayment, 
  setState, 
  lowProfileCode,
  planId
}: UsePaymentSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmitPayment = () => {
    // Prevent multiple submissions of the same payment
    if (hasSubmitted) {
      toast.warning('התשלום כבר נשלח, אנא המתן');
      return;
    }

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
    setHasSubmitted(true);
    
    try {
      console.log(`Submitting payment for plan ${planId} with lowProfileCode: ${lowProfileCode}`);
      
      // Log which operation we're performing
      if (planId === 'monthly') {
        console.log('Creating payment token for monthly subscription (trial period)');
      } else if (planId === 'annual') {
        console.log('Creating payment token and charging for annual subscription');
      } else if (planId === 'vip') {
        console.log('Processing one-time payment for VIP subscription');
      }
      
      submitPayment();
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
      
      // Store submission status in localStorage to prevent duplicates
      const sessionData = localStorage.getItem('payment_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.submitted = true;
        localStorage.setItem('payment_session', JSON.stringify(session));
      }
      
      // Set a timeout to check payment status
      setTimeout(() => {
        setIsSubmitting(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('אירעה שגיאה בשליחת התשלום');
      setIsSubmitting(false);
    }
  };
  
  // Function to reset submission state - useful when retrying
  const resetSubmissionState = () => {
    setHasSubmitted(false);
    setIsSubmitting(false);
    // Also update localStorage
    const sessionData = localStorage.getItem('payment_session');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.submitted = false;
      localStorage.setItem('payment_session', JSON.stringify(session));
    }
  };

  return {
    isSubmitting,
    hasSubmitted,
    handleSubmitPayment,
    resetSubmissionState
  };
};
