
import React, { createContext, useContext, useRef, useState } from 'react';
import { PaymentState, PaymentStatus, PaymentContextType, PaymentResponse } from '@/components/payment/types/payment';
import { usePaymentInitialization } from '@/hooks/payment/usePaymentInitialization';
import { usePaymentStatusCheck } from '@/hooks/payment/usePaymentStatusCheck';
import { useFrameMessages } from '@/hooks/payment/useFrameMessages';
import { toast } from 'sonner';

interface PaymentProviderProps {
  children: React.ReactNode;
  onPaymentComplete?: () => void;
  planId: string;
}

// Create the initial context with safety types
const initialState: PaymentState = {
  terminalNumber: '',
  cardcomUrl: '',
  paymentStatus: PaymentStatus.IDLE,
  sessionId: '',
  lowProfileCode: '',
};

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<PaymentProviderProps> = ({ 
  children, 
  onPaymentComplete = () => {},
  planId 
}) => {
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const [frameKey, setFrameKey] = useState(Date.now());
  const [state, setState] = useState<PaymentState>(initialState);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>(
    planId === 'monthly' ? 'token_only' : 'payment'
  );
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  // Set operation type based on plan
  React.useEffect(() => {
    if (planId === 'monthly') {
      setOperationType('token_only');
    } else {
      setOperationType('payment');
    }
  }, [planId]);

  const handlePaymentSuccess = () => {
    console.log('Payment successful');
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
    toast.success('התשלום בוצע בהצלחה!');
    
    setTimeout(() => {
      onPaymentComplete();
    }, 1000);
  };

  const handleError = (message: string) => {
    console.error('Payment error:', message);
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
    toast.error(message || 'אירעה שגיאה בעיבוד התשלום');
  };

  const { initializePayment } = usePaymentInitialization({
    planId,
    setState,
    masterFrameRef,
    operationType
  });

  const { startStatusCheck, checkPaymentStatus, cleanupStatusCheck } = usePaymentStatusCheck({ 
    setState 
  });

  useFrameMessages({
    handlePaymentSuccess,
    setState,
    checkPaymentStatus,
    lowProfileCode: state.lowProfileCode,
    sessionId: state.sessionId,
    operationType,
    planType: planId
  });

  React.useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);

  const resetFrames = () => {
    setFrameKey(Date.now());
    setTimeout(() => {
      if (masterFrameRef.current) {
        console.log('Forcing frame refresh');
        const src = masterFrameRef.current.src;
        masterFrameRef.current.src = '';
        setTimeout(() => {
          if (masterFrameRef.current) {
            masterFrameRef.current.src = src;
          }
        }, 50);
      }
    }, 50);
  };

  const handleRetry = () => {
    console.log('Retrying payment initialization');
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE
    }));
    resetFrames();
    
    setTimeout(() => {
      initializePayment();
    }, 300);
  };

  const submitPayment = () => {
    if (paymentInProgress) {
      console.log('Payment submission already in progress');
      return;
    }

    if (!state.lowProfileCode) {
      console.error("Missing lowProfileCode for payment", state);
      handleError("שגיאת אתחול תשלום - חסר קוד פרופיל, נא לרענן ולנסות שנית");
      return;
    }

    if (!masterFrameRef.current?.contentWindow) {
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
      setPaymentInProgress(false);
      return;
    }

    setPaymentInProgress(true);
    console.log('Submitting payment transaction with lowProfileCode:', state.lowProfileCode);

    try {
      const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
      const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
      const expirationMonth = document.querySelector<HTMLSelectElement>('select[name="expirationMonth"]')?.value || '';
      const expirationYear = document.querySelector<HTMLSelectElement>('select[name="expirationYear"]')?.value || '';

      if (!cardholderName || !cardOwnerId || !email || !phone || !expirationMonth || !expirationYear) {
        console.error("Missing required fields for payment");
        toast.error('יש למלא את כל השדות המסומנים בכוכבית');
        setPaymentInProgress(false);
        return;
      }

      if (!state.lowProfileCode) {
        console.error("lowProfileCode missing before send");
        handleError("חסר קוד פרופיל נמוך (lowProfileCode)");
        setPaymentInProgress(false);
        return;
      }

      const formData = {
        action: 'doTransaction',
        cardOwnerName: cardholderName,
        cardOwnerId,
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth,
        expirationYear,
        numberOfPayments: "1",
        lowProfileCode: state.lowProfileCode,
        sessionId: state.sessionId,
        ExternalUniqTranId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        TerminalNumber: state.terminalNumber,
        Operation: operationType === 'token_only' ? "ChargeAndCreateToken" : "ChargeOnly"
      };

      console.log('Sending transaction data:', { 
        ...formData,
        lowProfileCode: formData.lowProfileCode,
        sessionId: formData.sessionId
      });

      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
      masterFrameRef.current.contentWindow.postMessage(formData, '*');

      startStatusCheck(state.lowProfileCode, state.sessionId, operationType, planId);

      setTimeout(() => {
        setPaymentInProgress(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting payment:", error);
      handleError("שגיאה בשליחת פרטי התשלום");
      setPaymentInProgress(false);
    }
  };

  const resetPaymentState = () => {
    setState(initialState);
    resetFrames();
  };

  const value = {
    state,
    initializePayment,
    submitPayment,
    handleRetry,
    resetPaymentState,
    masterFrameRef,
    frameKey,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
