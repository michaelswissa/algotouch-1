
import { useState, useCallback, useEffect } from 'react';
import { PaymentStatus, PaymentStatusType } from '@/components/payment/types/payment';
import { usePaymentInitialization } from './payment/usePaymentInitialization';
import { usePaymentStatusCheck } from './payment/usePaymentStatusCheck';
import { toast } from 'sonner';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: (transactionId?: string) => void;
}

interface PaymentStateType {
  paymentStatus: PaymentStatusType;
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  cardcomUrl: string;
  reference: string;
  transactionId: string;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
  const [state, setState] = useState<PaymentStateType>({
    paymentStatus: PaymentStatus.INITIALIZING,
    lowProfileCode: '',
    sessionId: '',
    terminalNumber: '',
    cardcomUrl: 'https://secure.cardcom.solutions',
    reference: '',
    transactionId: ''
  });

  // Get operation type based on plan
  const operationType = planId === 'monthly' ? 'token_only' : 'payment';
  
  // Initialize payment and CardCom fields
  const { initializePayment } = usePaymentInitialization({
    planId,
    setState,
    masterFrameRef: { current: null }, // This will be provided by PaymentForm
    operationType: operationType as 'payment' | 'token_only'
  });

  // Handle payment status checks
  usePaymentStatusCheck({
    lowProfileCode: state.lowProfileCode,
    setState,
    paymentStatus: state.paymentStatus
  });

  // Handle payment submission
  const submitPayment = useCallback(() => {
    console.log(`Submitting payment for profile ${state.lowProfileCode}`);
    
    // Check if payment was already submitted
    const sessionData = localStorage.getItem('payment_session');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (session.submitted) {
        console.log('Payment was already submitted, not submitting again');
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
        return;
      }
    }

    // Update localStorage to mark as submitted
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.submitted = true;
      localStorage.setItem('payment_session', JSON.stringify(session));
    }

    // Send the message to CardCom iframe to submit the payment
    const submitEvent = {
      action: 'submitForm'
    };

    const masterFrame = document.getElementById('CardComMasterFrame') as HTMLIFrameElement;
    if (masterFrame && masterFrame.contentWindow) {
      masterFrame.contentWindow.postMessage(submitEvent, '*');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
      console.log('Payment submission message sent to CardCom iframe');
    } else {
      console.error('Master frame not found or not ready');
      toast.error('שגיאה בהגשת התשלום: מסגרת המאסטר לא נמצאה או לא מוכנה');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
    }
  }, [state.lowProfileCode]);

  // Handle retry functionality
  const handleRetry = useCallback(() => {
    console.log('Retrying payment initialization');
    
    // Clear any existing payment session
    localStorage.removeItem('payment_session');
    
    // Reset state
    setState({
      paymentStatus: PaymentStatus.INITIALIZING,
      lowProfileCode: '',
      sessionId: '',
      terminalNumber: '',
      cardcomUrl: 'https://secure.cardcom.solutions',
      reference: '',
      transactionId: ''
    });
    
    // Re-initialize payment
    setTimeout(() => {
      initializePayment();
    }, 500);
  }, [initializePayment]);

  // Handle payment success
  useEffect(() => {
    if (state.paymentStatus === PaymentStatus.SUCCESS && onPaymentComplete) {
      onPaymentComplete(state.transactionId);
    }
  }, [state.paymentStatus, state.transactionId, onPaymentComplete]);

  // Handle window messages from CardCom iframes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Filter out messages from other sources
      if (!event.data || !event.data.action) return;
      
      console.log('Received message from iframe:', event.data);
      
      if (event.data.action === 'cardProcessResult') {
        if (event.data.data && event.data.data.success) {
          console.log('Card processing successful, transaction ID:', event.data.data.transactionId);
          
          // Record transaction ID and update status
          setState(prev => ({
            ...prev,
            paymentStatus: PaymentStatus.SUCCESS,
            transactionId: event.data.data.transactionId || 'token-created'
          }));
          
          // Clear payment session from localStorage on success
          localStorage.removeItem('payment_session');
        } else {
          console.error('Card processing failed:', event.data.data);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error(event.data.data?.errorMessage || 'אירעה שגיאה בעיבוד התשלום');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return {
    ...state,
    operationType,
    submitPayment,
    handleRetry
  };
};
