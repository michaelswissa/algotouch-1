
import { useEffect } from 'react';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { PaymentStatusEnum } from '@/types/payment';

interface UseFrameMessagesProps {
  handlePaymentSuccess: () => void;
  setState: (updater: any) => void;
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
    if (!lowProfileCode || !sessionId) return;
    
    const handleMessageEvent = async (event: MessageEvent) => {
      if (!event.data) return;
      
      try {
        const data = event.data;
        console.log('Received message from iframe:', data);
        
        // Handle payment success message from CardCom
        if (data.action === 'TransactionApproved' || data.status === 'approved') {
          PaymentLogger.log('Transaction approved message received', { 
            data,
            operationType,
            planType
          });
          
          // Check if we should verify payment status with backend
          if (lowProfileCode) {
            PaymentLogger.log('Verifying payment status with backend', { lowProfileCode });
            const verified = await checkPaymentStatus(lowProfileCode);
            
            if (verified) {
              PaymentLogger.log('Payment verified with backend');
              handlePaymentSuccess();
            } else {
              PaymentLogger.log('Payment not verified with backend, continuing to check');
              // We'll continue to poll in the background
            }
          } else {
            // If we don't have a lowProfileCode, trust the iframe message
            PaymentLogger.log('No lowProfileCode to verify, trusting iframe message');
            handlePaymentSuccess();
          }
        }
        
        // Handle transaction rejected message
        if (data.action === 'TransactionRejected' || data.status === 'rejected') {
          PaymentLogger.error('Transaction rejected', { data });
          setState(prev => ({ 
            ...prev, 
            paymentStatus: 'FAILED',
            error: data.errorMessage || 'העסקה נדחתה על ידי חברת האשראי'
          }));
        }
        
        // Handle initialization response message
        if (data.action === 'initResponse') {
          if (data.success) {
            PaymentLogger.log('CardCom initialization successful', { data });
          } else {
            PaymentLogger.error('CardCom initialization failed', { data });
            setState(prev => ({ 
              ...prev, 
              paymentStatus: 'FAILED',
              error: 'שגיאה באתחול תהליך התשלום'
            }));
          }
        }
      } catch (error) {
        PaymentLogger.error('Error processing iframe message event', error);
      }
    };
    
    // Add event listener
    window.addEventListener('message', handleMessageEvent);
    
    // Clean up
    return () => {
      window.removeEventListener('message', handleMessageEvent);
    };
  }, [lowProfileCode, sessionId, setState, handlePaymentSuccess, checkPaymentStatus, operationType, planType]);
};
