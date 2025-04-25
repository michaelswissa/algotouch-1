
import { useEffect } from 'react';
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
  operation?: string;
}

export const useFrameMessages = ({
  handlePaymentSuccess,
  setState,
  checkPaymentStatus,
  lowProfileCode,
  sessionId,
  operationType,
  planType,
  operation = 'ChargeOnly'
}: UseFrameMessagesProps) => {
  // Listen to messages from the CardCom iframes, especially payment result messages
  useEffect(() => {
    if (!lowProfileCode || !sessionId) return;

    const handleFrameMessage = (event: MessageEvent) => {
      // Check if the message is from CardCom (we cannot check origin as it's in an iframe)
      if (event.data && typeof event.data === 'object') {
        console.log('Received frame message:', event.data);
        
        // Check for card type messages to update UI
        if (event.data.type === 'card-type') {
          setState((prev: any) => ({ 
            ...prev, 
            cardType: event.data.cardType || null,
            cardTypeIcon: event.data.cardTypeIcon || null
          }));
          return;
        }
        
        // Handle validation errors
        if (event.data.type === 'validation-error') {
          console.error('Card validation error:', event.data.error);
          toast.error(event.data.error || 'שגיאה באימות נתוני הכרטיס');
          return;
        }
        
        // Handle token creation success for monthly subscriptions
        if (
          (event.data.type === 'token-created' || event.data.tokenCreated) || 
          (operation === 'CreateTokenOnly' && (event.data.type === 'payment-success' || event.data.success))
        ) {
          console.log('Token creation success message received:', event.data);
          setState((prev: any) => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
          handlePaymentSuccess();
          return;
        }
        
        // Handle payment success response (could be from our webhook redirect)
        if (event.data.type === 'payment-success' || (event.data.success && event.data.transactionId)) {
          console.log('Payment success message received:', event.data);
          setState((prev: any) => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
          handlePaymentSuccess();
          return;
        }
        
        // Handle payment rejection/failure
        if (event.data.type === 'payment-failed' || (event.data.success === false && event.data.error)) {
          console.error('Payment failed message:', event.data);
          setState((prev: any) => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error(event.data.message || 'התשלום נדחה, נא לבדוק את פרטי הכרטיס');
          return;
        }
        
        // Handle payment processing status
        if (event.data.action === 'processTransaction' || event.data.status === 'processing') {
          console.log('Payment processing message:', event.data);
          setState((prev: any) => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          return;
        }
        
        // Handle transaction completed message (might not have final status yet)
        if (
          event.data.action === 'transactionCompleted' || 
          event.data.status === 'completed' || 
          event.data.type === 'transaction-completed'
        ) {
          console.log('Transaction completed message received, checking status with server');
          
          // Set processing status and check with the server for the final status
          setState((prev: any) => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
          
          // Use a small timeout to allow the CardCom server to process the payment
          setTimeout(() => {
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
          }, 1500);
          return;
        }
        
        // Handle field validation events
        if (event.data.action === 'fieldValidation') {
          const { field, isValid, message } = event.data;
          console.log(`Field validation - ${field}:`, { isValid, message });
          
          // Update state with validation results if needed
          // This can be used to show inline validation messages
          return;
        }
        
        // Handle any other CardCom messages we want to log
        if (
          event.data.source === 'cardcom' || 
          event.data.cardcom || 
          event.data.openfields ||
          event.data.lowProfileCode ||
          event.data.LowProfileCode
        ) {
          console.log('Other CardCom message:', event.data);
        }
      }
    };

    window.addEventListener('message', handleFrameMessage);
    return () => {
      window.removeEventListener('message', handleFrameMessage);
    };
  }, [lowProfileCode, sessionId, handlePaymentSuccess, setState, checkPaymentStatus, operationType, planType, operation]);
  
  // No methods to return as this is purely a hook for side effects
  return {};
};
