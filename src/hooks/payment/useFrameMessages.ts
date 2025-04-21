
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

    // Track whether we've already processed a success
    let successProcessed = false;
    
    // Track initialization status
    let isInitialized = false;
    
    // Debounce the status check to avoid too many calls
    let statusCheckTimeout: NodeJS.Timeout | null = null;
    
    // Helper function to safely schedule status checks
    const scheduleStatusCheck = (delay: number = 500) => {
      if (statusCheckTimeout) {
        clearTimeout(statusCheckTimeout);
      }
      
      statusCheckTimeout = setTimeout(() => {
        checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        statusCheckTimeout = null;
      }, delay);
    };

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
          isInitialized = true;
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
          return;
        }

        // Handle initialization error
        if (message.action === 'initializationError') {
          console.error('CardCom initialization error:', message);
          isInitialized = false;
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED, errorMessage: 'שגיאה באתחול טופס התשלום' }));
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
              console.log(`Starting payment status check for ${operationType} operation`);
              scheduleStatusCheck(100); // Quick first check
              
              // Do additional checks
              setTimeout(() => scheduleStatusCheck(500), 1000);  
              setTimeout(() => scheduleStatusCheck(500), 3000);
            } else {
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED, errorMessage: message.data?.Description || 'שגיאה בביצוע התשלום' }));
              toast.error(message.data?.Description || 'שגיאה בביצוע התשלום');
            }
            break;

          case 'HandleError':
          case 'HandleEror': // This is the correct spelling from CardCom
            console.error('Payment error:', message);
            setState(prev => ({ 
              ...prev, 
              paymentStatus: PaymentStatus.FAILED,
              errorMessage: message.message || 'שגיאה בביצוע התשלום'
            }));
            toast.error(message.message || 'שגיאה בביצוע התשלום');
            break;

          case '3DSProcessStarted':
            console.log('3DS Process Started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            scheduleStatusCheck(500);
            break;
            
          case '3DSProcessCompleted':
            console.log('3DS Process Completed - triggering status checks');
            scheduleStatusCheck(100);
            setTimeout(() => scheduleStatusCheck(500), 1000);
            setTimeout(() => scheduleStatusCheck(500), 3000);
            break;

          case 'paymentStarted':
            console.log('Payment process started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            scheduleStatusCheck(500);
            break;

          case 'paymentCompleted':
            console.log('Payment process completed - checking status');
            scheduleStatusCheck(100);
            setTimeout(() => scheduleStatusCheck(500), 1500);
            setTimeout(() => scheduleStatusCheck(500), 4000);
            break;

          case 'tokenCreationStarted':
            console.log('Token creation started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            scheduleStatusCheck(500);
            break;
            
          case 'tokenCreationCompleted':
            console.log('Token creation completed:', message);
            
            if (!successProcessed) {
              successProcessed = true;
              
              if (message.success) {
                console.log('Token creation successful, transitioning to success state');
                setState(prev => ({ 
                  ...prev, 
                  paymentStatus: PaymentStatus.SUCCESS,
                  transactionId: message.data?.token || message.data?.transactionId || 'token-created' 
                }));
                
                toast.success('אסימון נוצר בהצלחה, המנוי הופעל!');
                handlePaymentSuccess();
              } else {
                scheduleStatusCheck(100);
                setTimeout(() => scheduleStatusCheck(500), 1000);
                setTimeout(() => scheduleStatusCheck(500), 3000);
              }
            }
            break;

          case 'tokenCreationFailed':
            console.error('Token creation failed:', message);
            setState(prev => ({ 
              ...prev, 
              paymentStatus: PaymentStatus.FAILED,
              errorMessage: message.message || 'יצירת אסימון נכשלה'
            }));
            toast.error(message.message || 'יצירת אסימון נכשלה');
            break;

          case 'handleValidations':
            // Handle field validations (no state changes)
            console.log('Field validation:', message);
            break;
          
          case 'paymentSuccess':
          case 'HandleSuccess':
            console.log('Payment success message received:', message);
            
            if (!successProcessed) {
              successProcessed = true;
              console.log('Payment successful, transitioning to success state');
              setState(prev => ({ 
                ...prev, 
                paymentStatus: PaymentStatus.SUCCESS,
                transactionId: message.data?.transactionId || 'payment-success'
              }));
              
              toast.success('התשלום בוצע בהצלחה!');
              handlePaymentSuccess();
            }
            break;
            
          default:
            console.log('Unknown message action:', message.action, message);
            
            // Check if any success indicator in unknown messages
            if (message.success === true || 
                (message.data && message.data.success === true) || 
                (message.data && message.data.IsSuccess === true)) {
              
              console.log('Success indicator found in unknown message');
              scheduleStatusCheck();
            }
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (statusCheckTimeout) {
        clearTimeout(statusCheckTimeout);
      }
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
