
import { useEffect } from 'react';
import { PaymentStatusEnum } from '@/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: (state: any) => void;
  checkPaymentStatus: (lowProfileCode: string, sessionId: string) => Promise<void>;
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
    if (!lowProfileCode || !sessionId) {
      return;
    }
    
    // Set up window message listener for the CardCom 3DS redirects and callbacks
    const handleWindowMessage = (event: MessageEvent) => {
      // Only process messages from CardCom domains
      if (!event.origin.includes('cardcom.solutions') && 
          !event.origin.includes('cardcom.co.il')) {
        return;
      }

      PaymentLogger.log('Received message from CardCom', {
        origin: event.origin,
        data: event.data
      });

      try {
        // Handle different response formats from CardCom
        const responseData = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;
        
        // Success message from CardCom
        if (responseData.success === true || 
            responseData.Status === 'success' || 
            responseData.Status === 'completed' ||
            responseData.status === 'success' || 
            responseData.status === 'completed') {
          PaymentLogger.log('Payment successful', responseData);
          
          setState(prev => ({
            ...prev,
            paymentStatus: PaymentStatusEnum.SUCCESS
          }));
          
          handlePaymentSuccess();
        }
        // Error message from CardCom
        else if (responseData.error || 
                responseData.Status === 'failed' || 
                responseData.status === 'failed') {
          PaymentLogger.error('Payment failed', responseData);
          
          setState(prev => ({
            ...prev,
            paymentStatus: PaymentStatusEnum.FAILED,
            error: responseData.message || responseData.error || 'Payment failed'
          }));
        }
        // If we get a message without a clear status, check status via API
        else if (responseData.LowProfileCode || responseData.lowProfileCode) {
          PaymentLogger.log('Received message without clear status, checking payment status');
          
          // Use the provided lowProfileCode or fall back to the one we have
          const lpCode = responseData.LowProfileCode || responseData.lowProfileCode || lowProfileCode;
          
          // Check payment status via API
          checkPaymentStatus(lpCode, sessionId);
        }
      } catch (error) {
        PaymentLogger.error('Error processing CardCom message', error);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    
    PaymentLogger.log('Set up CardCom message listener', {
      lowProfileCode, 
      sessionId,
      operationType,
      planType
    });
    
    // Clean up event listener when component unmounts or dependencies change
    return () => {
      window.removeEventListener('message', handleWindowMessage);
      PaymentLogger.log('Removed CardCom message listener');
    };
  }, [lowProfileCode, sessionId, handlePaymentSuccess, setState, checkPaymentStatus, operationType, planType]);
};
