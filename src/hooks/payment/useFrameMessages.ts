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
}

export const useFrameMessages = ({
  handlePaymentSuccess,
  setState,
  checkPaymentStatus,
  lowProfileCode,
  sessionId,
  operationType = 'payment'
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
            
            // Per CardCom docs, we should check message.data.IsSuccess
            if (message.data?.IsSuccess) {
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
              
              // If this is a token operation, we need to start checking immediately
              // Otherwise the UI can get stuck in the loading state
              if (operationType === 'token_only') {
                console.log('Token operation - initiating immediate status check');
                checkPaymentStatus(lowProfileCode, sessionId, operationType);
                
                // Additional checks after a brief delay to catch fast responses
                setTimeout(() => {
                  checkPaymentStatus(lowProfileCode, sessionId, operationType);
                }, 2000);
              } else {
                setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
                handlePaymentSuccess();
              }
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
            // Start checking status immediately when 3DS starts
            setTimeout(() => checkPaymentStatus(lowProfileCode, sessionId, operationType), 2000);
            break;
            
          case '3DSProcessCompleted':
            console.log('3DS Process Completed');
            // Check status after 3DS completion
            checkPaymentStatus(lowProfileCode, sessionId, operationType);
            break;

          case 'paymentStarted':
            console.log('Payment process started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            break;

          case 'paymentCompleted':
            console.log('Payment process completed');
            // Check status after completion
            checkPaymentStatus(lowProfileCode, sessionId, operationType);
            break;

          case 'tokenCreationStarted':
            console.log('Token creation started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            
            // Immediately start checking for token creation status
            checkPaymentStatus(lowProfileCode, sessionId, operationType);
            break;
            
          case 'tokenCreationCompleted':
            console.log('Token creation completed', message);
            // Check status specifically for token and force a quick status check
            checkPaymentStatus(lowProfileCode, sessionId, operationType);
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
            console.log('Unknown message action:', message.action);
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType]);
};
