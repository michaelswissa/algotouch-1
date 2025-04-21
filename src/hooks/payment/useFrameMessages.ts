
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
          console.warn('Received message from untrusted origin:', event.origin);
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

        switch (message.action) {
          case 'HandleSubmit':
            console.log('HandleSubmit message received:', message);
            
            // Always check if the payment processing should start
            if (message.data?.IsSuccess) {
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
              
              // Always check payment status regardless of operation type
              console.log(`Starting payment status check for ${operationType} operation`);
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
              
              // Set up additional checks for both operation types to ensure we catch the result
              const checkDelay = operationType === 'token_only' ? 2000 : 3000;
              setTimeout(() => {
                console.log(`Performing follow-up status check for ${operationType}`);
                checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
              }, checkDelay);
            } else {
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
              toast.error(message.data?.Description || 'שגיאה בביצוע התשלום');
            }
            break;

          case 'HandleError':
          case 'HandleEror': // This is the correct spelling from CardCom
            console.error('Payment error:', message);
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
            toast.error(message.message || 'שגיאה בביצוע התשלום');
            break;

          case '3DSProcessStarted':
            console.log('3DS Process Started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            // Immediately start checking status when 3DS starts
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            break;
            
          case '3DSProcessCompleted':
            console.log('3DS Process Completed');
            // Aggressively check status after 3DS completion with short intervals
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 1000);
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 3000);
            break;

          case 'paymentStarted':
            console.log('Payment process started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            break;

          case 'paymentCompleted':
            console.log('Payment process completed');
            // Check status immediately and again after a short delay
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 1500);
            break;

          case 'tokenCreationStarted':
            console.log('Token creation started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            
            // Start checking status immediately for token creation
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            break;
            
          case 'tokenCreationCompleted':
            console.log('Token creation completed', message);
            // Aggressive checking for token creation completion
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 1000);
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 3000);
            break;

          case 'tokenCreationFailed':
            console.error('Token creation failed:', message);
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
            toast.error(message.message || 'יצירת אסימון נכשלה');
            break;

          case 'handleValidations':
            // Handle field validations
            console.log('Field validation:', message);
            break;
            
          default:
            console.log('Unknown message action:', message.action, message);
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
