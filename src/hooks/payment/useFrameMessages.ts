
import { useCallback, useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: (updater: any) => void;
  checkPaymentStatus: (lowProfileCode: string, sessionId: string, operationType: 'payment' | 'token_only') => Promise<boolean>;
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
  // Helper to handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    // Ignore messages from other origins
    if (event.origin === window.location.origin) {
      const { action, status, data } = event.data || {};
      
      if (action === 'payment-ready') {
        console.log('Received payment-ready message');
        setState(prev => ({ ...prev, isFramesReady: true }));
      }

      if (action === 'payment-success') {
        console.log('Received payment-success message');
        handlePaymentSuccess();
      }

      if (action === 'payment-status-update' && status === 'success') {
        console.log('Received payment-status-update message with success status');
        handlePaymentSuccess();
      }

      if (action === 'payment-error') {
        console.error('Received payment-error message:', data);
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          error: data?.message || 'אירעה שגיאה בתהליך התשלום'
        }));
      }

      if (action === 'check-payment-status' && lowProfileCode && sessionId) {
        console.log('Received check-payment-status message');
        checkPaymentStatus(lowProfileCode, sessionId, operationType)
          .catch(error => console.error('Error checking payment status:', error));
      }
    }
  }, [handlePaymentSuccess, setState, checkPaymentStatus, lowProfileCode, sessionId, operationType]);

  // Add message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return null;
};
