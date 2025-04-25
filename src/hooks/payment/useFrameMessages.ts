
import React, { useEffect } from 'react';  // Add React and useEffect import
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: (updater: any) => void;
  checkPaymentStatus: (lowProfileCode: string, sessionId: string, operationType: string, planType: string) => void;
  lowProfileCode: string;
  sessionId: string;
  operationType: 'payment' | 'token_only';
  planType: string;
}

export const useFrameMessages = ({
  handlePaymentSuccess,
  setState,
  checkPaymentStatus,
  lowProfileCode,
  sessionId,
  operationType,
  planType
}: UseFrameMessagesProps) => {
  // Listen to messages from the CardCom iframes
  useEffect(() => {
    if (!lowProfileCode || !sessionId) return;

    const handleFrameMessage = (event: MessageEvent) => {
      // Check if the message is from CardCom (we cannot check origin as it's in an iframe)
      if (event.data && typeof event.data === 'object') {
        console.log('Received frame message:', event.data);
        
        // Handle validation errors immediately
        if (event.data.type === 'validation-error' || event.data.action === 'handleValidationError') {
          console.error('Card validation error:', event.data.error || event.data.message);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
          toast.error(event.data.error || event.data.message || 'שגיאה באימות נתוני הכרטיס');
          return;
        }
        
        // Handle card validation response
        if (event.data.action === 'handleValidations') {
          if (!event.data.isValid) {
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
            toast.error(event.data.message || 'פרטי הכרטיס אינם תקינים');
            return;
          }
        }

        // Handle payment rejection/failure immediately
        if (
          event.data.type === 'payment-failed' || 
          (event.data.success === false && event.data.error) ||
          event.data.action === 'HandleEror'
        ) {
          console.error('Payment failed message:', event.data);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error(event.data.message || event.data.error || 'התשלום נדחה, נא לבדוק את פרטי הכרטיס');
          return;
        }
        
        // Handle transaction processing status
        if (event.data.action === 'processTransaction' || event.data.status === 'processing') {
          console.log('Payment processing message:', event.data);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          return;
        }
        
        // Handle transaction completed message
        if (
          event.data.action === 'transactionCompleted' || 
          event.data.status === 'completed' || 
          event.data.type === 'transaction-completed' ||
          event.data.action === 'HandleSubmit'
        ) {
          console.log('Transaction completed message received, checking status with server');
          
          // Set processing status and check with the server for the final status
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          
          // Use a small timeout to allow the CardCom server to process the payment
          setTimeout(() => {
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
          }, 1500);
          return;
        }

        // Handle payment success response
        if (event.data.type === 'payment-success' || (event.data.success && event.data.transactionId)) {
          console.log('Payment success message received:', event.data);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
          handlePaymentSuccess();
          return;
        }
      }
    };

    window.addEventListener('message', handleFrameMessage);
    return () => {
      window.removeEventListener('message', handleFrameMessage);
    };
  }, [lowProfileCode, sessionId, handlePaymentSuccess, setState, checkPaymentStatus, operationType, planType]);
};
