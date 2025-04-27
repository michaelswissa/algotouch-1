
import { useEffect } from 'react';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: React.Dispatch<React.SetStateAction<any>>;
  checkPaymentStatus: (lowProfileCode: string) => Promise<boolean>;
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
  
  useEffect(() => {
    if (!lowProfileCode) return;
    
    const handleFrameMessages = async (event: MessageEvent) => {
      if (!event.data) return;
      
      try {
        PaymentLogger.log('Received message from iframe:', event.data);
        
        // Handle payment result message
        if (event.data.action === 'paymentResult') {
          if (event.data.success) {
            PaymentLogger.success('Payment successful from iframe message', event.data);
            handlePaymentSuccess();
          } else {
            PaymentLogger.error('Payment failed from iframe message', event.data);
            setState(prev => ({ 
              ...prev, 
              paymentStatus: PaymentStatus.FAILED,
              error: event.data.error || 'Payment failed'
            }));
          }
          return;
        }
        
        // Handle transaction done message - need to check status
        if (event.data.action === 'transactionDone' || event.data.transactionDone) {
          PaymentLogger.log('Transaction done, checking status', { lowProfileCode });
          
          try {
            await checkPaymentStatus(lowProfileCode);
          } catch (error) {
            PaymentLogger.error('Error checking status after transaction done message:', error);
          }
          return;
        }
      } catch (error) {
        PaymentLogger.error('Error processing iframe message:', error);
      }
    };
    
    window.addEventListener('message', handleFrameMessages);
    
    return () => {
      window.removeEventListener('message', handleFrameMessages);
    };
  }, [lowProfileCode, sessionId, handlePaymentSuccess, setState, checkPaymentStatus, operationType, planType]);
};
