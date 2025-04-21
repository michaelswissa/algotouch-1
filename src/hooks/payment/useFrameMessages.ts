
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

    // For debugging
    console.log('Setting up useFrameMessages listener', { 
      lowProfileCode, 
      sessionId, 
      operationType, 
      planType 
    });

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
            
            // Handle submit action
            if (message.data?.IsSuccess) {
              console.log('Setting payment status to PROCESSING');
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
              
              // Start checking payment status
              console.log(`Starting payment status check for ${operationType} operation - initial check`);
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
              
              // Do additional checks at different intervals to catch completion
              setTimeout(() => {
                console.log(`Follow-up status check for ${operationType} - 3s`);
                checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
              }, 3000);
              
              setTimeout(() => {
                console.log(`Follow-up status check for ${operationType} - 7s`);
                checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
              }, 7000);
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
            // Check status when 3DS starts
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            break;
            
          case '3DSProcessCompleted':
            console.log('3DS Process Completed - triggering status checks');
            // Aggressive checking after 3DS completion
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            
            // Staggered checks to catch completion
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 1000);
            
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 3000);
            
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 6000);
            break;

          case 'paymentStarted':
            console.log('Payment process started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            break;

          case 'paymentCompleted':
            console.log('Payment process completed - checking status');
            // Payment completed - check status immediately
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            
            // Additional check after short delay
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 1500);
            
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 4000);
            break;

          case 'tokenCreationStarted':
            console.log('Token creation started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            
            // Start status checks for token creation
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            break;
            
          case 'tokenCreationCompleted':
            console.log('Token creation completed. Checking status:', message);
            
            // Aggressive checking for token completion
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            
            // Multiple checks with delays
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 1000);
            
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 3000);
            
            setTimeout(() => {
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }, 7000);
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
