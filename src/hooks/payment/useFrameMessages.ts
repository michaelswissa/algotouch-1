
import { useEffect, useCallback } from 'react';
import { CardComMessage } from '@/components/payment/types/payment';
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
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      // Check if the message comes from CardCom
      if (event.data && typeof event.data === 'object') {
        const message = event.data as CardComMessage;
        
        console.log('Received message from iframe:', message);
        
        if (message.action === 'cardNumberValid' && message.isValid) {
          console.log('Card number is valid', message);
        }
        
        if (message.action === 'cardType' && message.cardType) {
          console.log('Card type detected:', message.cardType);
        }
        
        if (message.action === 'cvvValid' && message.isValid) {
          console.log('CVV is valid', message);
        }
        
        if (message.action === 'transactionComplete' || message.action === 'transactionSuccess') {
          console.log('Transaction completed successfully', message);
          
          // Start checking status immediately after transaction completion
          if (lowProfileCode && sessionId) {
            checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
          }
          
          if (message.success === true) {
            handlePaymentSuccess();
          }
        }
        
        if (message.action === 'transactionFailed') {
          console.error('Transaction failed', message);
          setState(prev => ({ 
            ...prev, 
            paymentStatus: 'failed',
            errorMessage: message.message || 'העסקה נכשלה'
          }));
          toast.error(message.message || 'העסקה נכשלה');
        }
        
        // Handle validation errors
        if (message.action === 'fieldError') {
          console.error('Field validation error:', message);
          toast.error(`שגיאת תיקוף: ${message.message || 'שדה לא תקין'}`);
        }
      }
    } catch (error) {
      console.error('Error processing iframe message:', error);
    }
  }, [handlePaymentSuccess, setState, checkPaymentStatus, lowProfileCode, sessionId, operationType, planType]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);
};
