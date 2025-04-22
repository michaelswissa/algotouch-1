
import { useEffect } from 'react';
import { PaymentState } from '@/components/payment/types/payment';

interface UseFrameMessagesProps {
  setState: (updater: (prev: PaymentState) => PaymentState) => void;
  handlePaymentSuccess: () => void;
  checkPaymentStatus: () => void;
  lowProfileCode?: string;
  sessionId?: string;
  operationType?: 'payment' | 'token_only';
  planType?: string;
}

export const useFrameMessages = ({
  setState,
  handlePaymentSuccess,
  checkPaymentStatus,
  lowProfileCode,
  sessionId,
  operationType,
  planType
}: UseFrameMessagesProps) => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      
      // Ignore non-CardCom messages
      if (!data || typeof data !== 'object' || !data.action) {
        return;
      }
      
      // Log received message for debugging
      console.log('Received message from iframe:', data);
      
      // Handle different message types
      if (data.action === 'loaded') {
        // Iframe has loaded
        console.log('CardCom iframe loaded:', data);
      } 
      else if (data.action === 'ready') {
        // CardCom component is ready
        console.log('CardCom component ready:', data);
      }
      else if (data.action === 'frame-ready') {
        // Card number frame is ready
        console.log('Card number frame ready:', data);
      }
      else if (data.action === 'card-validated' || data.action === 'card-validation-error') {
        // Card validation feedback
        console.log('Card validation result:', data);
        
        if (data.action === 'card-validated') {
          setState(prev => ({
            ...prev,
            cardBrand: data.cardBrand,
            cardType: data.cardType
          }));
        }
      }
      else if (data.action === 'cvv-validated' || data.action === 'cvv-validation-error') {
        // CVV validation feedback
        console.log('CVV validation result:', data);
      }
      else if (data.action === 'doTransaction-result') {
        // Transaction result received
        console.log('Transaction result:', data);
        
        if (data.success) {
          // For token-only operation (monthly subscription with delayed charge)
          if (operationType === 'token_only' || planType === 'monthly') {
            console.log('Token creation successful, checking status with backend');
            checkPaymentStatus();
          } else {
            // For regular payment operations
            console.log('Payment successful, checking status with backend');
            checkPaymentStatus();
          }
        } else {
          // Transaction failed
          console.error('Transaction failed:', data.error || 'Unknown error');
          setState(prev => ({
            ...prev,
            paymentStatus: 'failed',
            error: data.error || 'Unknown error'
          }));
        }
      }
      else if (data.action === 'payment-status-update') {
        // Status update from our backend status check
        if (data.status === 'success') {
          handlePaymentSuccess();
        }
      }
    };
    
    // Add event listener for iframe messages
    window.addEventListener('message', handleMessage);
    
    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setState, handlePaymentSuccess, checkPaymentStatus, lowProfileCode, sessionId, operationType, planType]);
};
