import { useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: (updater: any) => void;
  checkPaymentStatus: (lowProfileCode: string, sessionId: string, operationType?: 'payment' | 'token_only', planType?: string) => void;
  lowProfileCode: string;
  sessionId: string;
  operationType?: 'payment' | 'token_only';
  planType?: string;
}

export const useFrameMessages = ({
  handlePaymentSuccess,
  setState,
  checkPaymentStatus,
  lowProfileCode,
  sessionId,
  operationType = 'payment',
  planType
}: UseFrameMessagesProps) => {
  useEffect(() => {
    if (!lowProfileCode || !sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        // Validate message origin for security
        const isTrustedOrigin = event.origin.includes('cardcom.solutions');
        if (!isTrustedOrigin) {
          console.log('Ignoring message from untrusted origin:', event.origin);
          return;
        }

        const message = event.data;
        console.log('Received message from iframe:', message);

        if (!message || typeof message !== 'object') {
          return;
        }

        // Handle initialization success message
        if (message.action === 'initialized') {
          console.log('CardCom fields initialized successfully');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
          return;
        }

        // Handle initialization error
        if (message.action === 'initializationError') {
          console.error('CardCom initialization error:', message);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error('שגיאה באתחול טופס התשלום');
          return;
        }

        // Follow the example's simpler approach to message handling
        if (message.action === 'HandleSubmit' || message.action === 'handleSubmit') {
          console.log('HandleSubmit message received:', message);
          
          if (message.data?.IsSuccess) {
            console.log('Payment submission successful, processing payment...');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            
            // Skip redundant status checks and rely directly on the iframe result
            // This is more similar to the example's approach
            setTimeout(() => {
              handlePaymentSuccess();
              
              // Still keep a single status check to ensure backend sync
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 2000);
          } else {
            console.error('Payment submission failed:', message.data?.Description);
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
            toast.error(message.data?.Description || 'שגיאה בביצוע התשלום');
          }
          return;
        }

        if (message.action === 'HandleError' || message.action === 'HandleEror') {
          console.error('Payment error:', message);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error(message.message || 'שגיאה בביצוע התשלום');
          return;
        }

        // Simple handling of validation messages
        if (message.action === 'handleValidations') {
          console.log('Field validation:', message);
          // Validation handling is separated in the example
          return;
        }
        
        // Additional CardCom-specific events - handle simply
        if (message.action?.includes('3DS') || 
            message.action?.includes('payment') || 
            message.action?.includes('token')) {
          console.log('CardCom event received:', message.action);
          // Simply log these events, similar to example which uses console.log
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };

    console.log('Setting up message event listener for CardCom iframe');
    window.addEventListener('message', handleMessage);
    
    return () => {
      console.log('Removing message event listener for CardCom iframe');
      window.removeEventListener('message', handleMessage);
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
