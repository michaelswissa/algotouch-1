
import { useEffect } from 'react';
import { PaymentStatusEnum } from '@/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: (state: any) => void;
  checkPaymentStatus: (lowProfileCode: string, sessionId: string) => void;
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
    if (!lowProfileCode || !sessionId) return;

    const handleFrameMessages = (event: MessageEvent) => {
      // Allow messages from CardCom domains or local development environment
      if (!event.origin.includes('cardcom.solutions') && 
          !event.origin.includes('localhost') && 
          !event.origin.includes(window.location.origin) &&
          !event.origin.includes('lovableproject.com') &&
          !event.origin.includes('lovable.app')) {
        return;
      }
  
      PaymentLogger.log('Received message from CardCom:', event.data);
      
      try {
        const data = event.data;

        // Handle different message types from CardCom
        if (data) {
          // Handle success message
          if (data.action === 'approvedTransaction' || 
              data.status === 'success' || 
              data.action === 'success') {
            PaymentLogger.log('Payment transaction approved:', data);
            handlePaymentSuccess();
          } 
          // Handle payment form submission
          else if (data.action === 'doTransaction') {
            PaymentLogger.log('Processing payment transaction:', data);
            
            // Update UI status
            setState(prev => ({
              ...prev,
              paymentStatus: PaymentStatusEnum.PROCESSING
            }));
            
            // Start checking payment status
            if (lowProfileCode && sessionId) {
              setTimeout(() => {
                checkPaymentStatus(lowProfileCode, sessionId);
              }, 2000);
            }
          } 
          // Handle initialization success
          else if (data.action === 'init' && data.status === 'success') {
            PaymentLogger.log('CardCom fields initialized successfully');
          } 
          // Handle validation messages
          else if (data.action === 'validation') {
            PaymentLogger.log('Field validation:', data);
          } 
          // Handle errors
          else if (data.status === 'error' || data.action === 'error') {
            PaymentLogger.error('Error from CardCom:', data);
            
            setState(prev => ({
              ...prev,
              paymentStatus: PaymentStatusEnum.FAILED,
              error: data.message || 'שגיאה בביצוע התשלום'
            }));
          }
          // Handle 3DS specific messages
          else if (data.status === '3ds_challenge') {
            PaymentLogger.log('3DS challenge initiated:', data);
          }
          else if (data.status === '3ds_complete') {
            PaymentLogger.log('3DS verification completed:', data);
          }
        }
      } catch (error) {
        PaymentLogger.error('Error processing frame message:', error);
      }
    };
  
    window.addEventListener('message', handleFrameMessages);
    return () => window.removeEventListener('message', handleFrameMessages);
  }, [lowProfileCode, sessionId, handlePaymentSuccess, setState, checkPaymentStatus, operationType, planType]);
};
