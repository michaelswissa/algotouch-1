
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { PaymentStatus, PaymentStatusType, CardOwnerDetails, PaymentSessionData } from '@/components/payment/types/payment';
import { toast } from 'sonner';
import { usePaymentSession } from '@/hooks/payment/usePaymentSession';
import { CardComService } from '@/services/payment/CardComService';
import { usePaymentStatusCheck } from '@/hooks/payment/usePaymentStatusCheck';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

interface PaymentState {
  paymentStatus: PaymentStatusType;
  isInitializing: boolean;
  terminalNumber: string;
  cardcomUrl: string;
  lowProfileCode: string;
  sessionId: string;
  reference: string;
  operationType: 'payment' | 'token_only';
  error: string | null;
  planId: string | null;
}

interface PaymentContextType extends PaymentState {
  initializePayment: (planId: string) => Promise<boolean>;
  submitPayment: (cardOwnerDetails: CardOwnerDetails) => Promise<boolean>;
  resetPaymentState: () => void;
  setPaymentStatus: (status: PaymentStatusType) => void;
  setError: (error: string | null) => void;
  updateSessionData: (data: Partial<PaymentSessionData>) => void;
}

const initialState: PaymentState = {
  paymentStatus: PaymentStatus.IDLE,
  isInitializing: false,
  terminalNumber: '160138',
  cardcomUrl: 'https://secure.cardcom.solutions',
  lowProfileCode: '',
  sessionId: '',
  reference: '',
  operationType: 'payment',
  error: null,
  planId: null,
};

export const PaymentContext = createContext<PaymentContextType>({
  ...initialState,
  initializePayment: async () => false,
  submitPayment: async () => false,
  resetPaymentState: () => {},
  setPaymentStatus: () => {},
  setError: () => {},
  updateSessionData: () => {},
});

export const usePaymentContext = () => useContext(PaymentContext);

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PaymentState>(initialState);
  const { initializePaymentSession } = usePaymentSession({ setState });
  
  // Add payment status check hook for monitoring payment completion
  const { startStatusCheck, checkPaymentStatus, cleanupStatusCheck } = 
    usePaymentStatusCheck({ 
      setState,
      onSuccess: () => {
        PaymentLogger.log('Payment status check succeeded, payment is confirmed');
      }
    });

  // Cleanup payment status check on unmount
  useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);

  const initializePayment = async (planId: string): Promise<boolean> => {
    if (state.lowProfileCode && state.paymentStatus !== PaymentStatus.FAILED) {
      console.log('Payment already initialized with lowProfileCode:', state.lowProfileCode);
      return true;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isInitializing: true, 
        paymentStatus: PaymentStatus.INITIALIZING,
        error: null,
        planId
      }));

      // Set operationType based on plan
      const operationType = planId === 'monthly' ? 'token_only' : 'payment';
      
      // Get user data for payment
      let email = '';
      let fullName = '';

      // Try to get data from contract or registration
      const contractData = sessionStorage.getItem('contract_data');
      const registrationData = sessionStorage.getItem('registration_data');
      
      if (contractData) {
        try {
          const parsed = JSON.parse(contractData);
          email = parsed.email || '';
          fullName = parsed.fullName || '';
        } catch (e) {
          console.error('Error parsing contract data', e);
        }
      } else if (registrationData) {
        try {
          const parsed = JSON.parse(registrationData);
          email = parsed.email || '';
          if (parsed.userData) {
            const { firstName, lastName } = parsed.userData;
            if (firstName && lastName) {
              fullName = `${firstName} ${lastName}`;
            }
          }
        } catch (e) {
          console.error('Error parsing registration data', e);
        }
      }

      if (!email) {
        throw new Error('חסרים פרטי התקשרות, אנא מלא את פרטי הרישום');
      }
      
      // Get user ID if available (might not be if user is not logged in yet)
      const userId = sessionStorage.getItem('userId') || null;

      // Real payment initialization via CardCom
      const paymentSession = await initializePaymentSession(
        planId,
        userId,
        { email, fullName },
        operationType
      );
      
      // Update state with real session data
      setState(prev => ({
        ...prev,
        isInitializing: false,
        paymentStatus: PaymentStatus.IDLE,
        operationType,
        sessionId: paymentSession.sessionId,
        lowProfileCode: paymentSession.lowProfileCode,
        terminalNumber: paymentSession.terminalNumber,
        cardcomUrl: paymentSession.cardcomUrl || 'https://secure.cardcom.solutions',
        reference: paymentSession.reference,
      }));
      
      PaymentLogger.log('Payment initialized successfully', { 
        lowProfileCode: paymentSession.lowProfileCode,
        operationType 
      });

      return true;
    } catch (error) {
      console.error('Error initializing payment:', error);
      setState(prev => ({ 
        ...prev, 
        isInitializing: false,
        paymentStatus: PaymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Failed to initialize payment'
      }));
      toast.error('אירעה שגיאה באתחול התשלום');
      return false;
    }
  };

  const submitPayment = async (cardOwnerDetails: CardOwnerDetails): Promise<boolean> => {
    try {
      if (state.paymentStatus === PaymentStatus.PROCESSING) {
        return false; // Prevent duplicate submissions
      }

      if (!state.lowProfileCode) {
        toast.error('חסר מזהה ייחודי לעסקה, אנא נסה/י שנית');
        return false;
      }

      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.PROCESSING,
        error: null
      }));
      
      PaymentLogger.log('Submitting payment', { 
        lowProfileCode: state.lowProfileCode,
        operationType: state.operationType
      });

      // Start status check for payment completion
      startStatusCheck(
        state.lowProfileCode,
        state.sessionId,
        state.operationType,
        state.planId || ''
      );
      
      // In real implementation, CardCom handles the submission through the iframe
      // We just need to check the status after submission
      
      // Check payment status after a short delay to allow CardCom to process
      setTimeout(async () => {
        try {
          await checkPaymentStatus(state.lowProfileCode);
        } catch (e) {
          PaymentLogger.error('Error during payment status check', e);
        }
      }, 3000);
      
      return true;
    } catch (error) {
      console.error('Error submitting payment:', error);
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Failed to process payment'
      }));
      toast.error('אירעה שגיאה בתהליך התשלום');
      return false;
    }
  };

  const resetPaymentState = () => {
    // Clean up any status check in progress
    cleanupStatusCheck();
    setState(initialState);
  };

  const setPaymentStatus = (paymentStatus: PaymentStatusType) => {
    setState(prev => ({ ...prev, paymentStatus }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const updateSessionData = (data: Partial<PaymentSessionData>) => {
    setState(prev => ({ ...prev, ...data }));
  };

  const contextValue: PaymentContextType = {
    ...state,
    initializePayment,
    submitPayment,
    resetPaymentState,
    setPaymentStatus,
    setError,
    updateSessionData,
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
};
