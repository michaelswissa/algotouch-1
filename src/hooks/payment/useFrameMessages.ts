
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

    // מעקב אחר הצלחה כדי למנוע כפילות
    let successProcessed = false;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        // וידוא מקור ההודעה לאבטחה
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

        // טיפול בהודעות אתחול
        if (message.action === 'initialized') {
          console.log('CardCom fields initialized successfully');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
          return;
        }

        // טיפול בשגיאות אתחול
        if (message.action === 'initializationError') {
          console.error('CardCom initialization error:', message);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED, errorMessage: 'שגיאה באתחול טופס התשלום' }));
          toast.error('שגיאה באתחול טופס התשלום');
          return;
        }

        // טיפול בפעולות שונות
        switch (message.action) {
          // שליחת טופס
          case 'HandleSubmit':
            console.log('HandleSubmit message received:', message);
            
            if (message.data?.IsSuccess) {
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
              
              // בדיקת סטטוס עסקה
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            } else {
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED, errorMessage: message.data?.Description || 'שגיאה בביצוע התשלום' }));
              toast.error(message.data?.Description || 'שגיאה בביצוע התשלום');
            }
            break;

          // שגיאות
          case 'HandleError':
          case 'HandleEror': // זהו האיות המדויק מ-CardCom
            console.error('Payment error:', message);
            setState(prev => ({ 
              ...prev, 
              paymentStatus: PaymentStatus.FAILED,
              errorMessage: message.message || 'שגיאה בביצוע התשלום'
            }));
            toast.error(message.message || 'שגיאה בביצוע התשלום');
            break;

          // תהליך 3DS
          case '3DSProcessStarted':
            console.log('3DS Process Started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            break;
            
          case '3DSProcessCompleted':
            console.log('3DS Process Completed');
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            break;

          // תהליך תשלום
          case 'paymentStarted':
            console.log('Payment process started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            break;

          case 'paymentCompleted':
            console.log('Payment process completed');
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            break;

          // יצירת אסימון
          case 'tokenCreationStarted':
            console.log('Token creation started');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            break;
            
          case 'tokenCreationCompleted':
            console.log('Token creation completed:', message);
            
            if (!successProcessed) {
              if (message.success) {
                successProcessed = true;
                setState(prev => ({ 
                  ...prev, 
                  paymentStatus: PaymentStatus.SUCCESS,
                  transactionId: message.data?.token || message.data?.transactionId || 'token-created' 
                }));
                toast.success('המנוי הופעל בהצלחה!');
                handlePaymentSuccess();
              } else {
                checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
              }
            }
            break;

          // כישלון יצירת אסימון
          case 'tokenCreationFailed':
            console.error('Token creation failed:', message);
            setState(prev => ({ 
              ...prev, 
              paymentStatus: PaymentStatus.FAILED,
              errorMessage: message.message || 'יצירת אסימון נכשלה'
            }));
            toast.error(message.message || 'יצירת אסימון נכשלה');
            break;

          // הצלחת תשלום
          case 'paymentSuccess':
          case 'HandleSuccess':
            console.log('Payment success message received:', message);
            
            if (!successProcessed) {
              successProcessed = true;
              setState(prev => ({ 
                ...prev, 
                paymentStatus: PaymentStatus.SUCCESS,
                transactionId: message.data?.transactionId || 'payment-success'
              }));
              
              toast.success('התשלום בוצע בהצלחה!');
              handlePaymentSuccess();
            }
            break;
            
          // אחר
          default:
            // בדיקה אם ישנם סימני הצלחה בהודעות לא ידועות
            if (message.success === true || 
                (message.data && message.data.success === true) || 
                (message.data && message.data.IsSuccess === true)) {
              
              console.log('Success indicator found in unknown message');
              checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
            }
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };

    // הוספת מאזין להודעות
    window.addEventListener('message', handleMessage);
    
    // ניקוי המאזין
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
