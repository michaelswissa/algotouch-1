
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PaymentStatus, PaymentStatusType, CardOwnerDetails, PaymentSessionData } from '@/components/payment/types/payment';
import { toast } from 'sonner';

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
  terminalNumber: '',
  cardcomUrl: '',
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

  const initializePayment = async (planId: string): Promise<boolean> => {
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
      setState(prev => ({ ...prev, operationType }));

      // In a real implementation, we would make API calls here to initialize payment
      // For now, let's simulate a successful initialization
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

      // When connected to the payment service, this would set all the necessary session data
      // For now, just update the state for demonstration
      setState(prev => ({
        ...prev,
        isInitializing: false,
        paymentStatus: PaymentStatus.IDLE,
        // In a real implementation, these values would come from the API response
        terminalNumber: '160138', // Example value
        cardcomUrl: 'https://secure.cardcom.solutions',
        lowProfileCode: `mock-${Date.now()}`,
        sessionId: `session-${Date.now()}`,
        reference: `ref-${Date.now()}`,
      }));

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
      
      // In a real implementation, we would make API calls here to process payment
      // For now, let's simulate a successful payment
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.SUCCESS,
      }));
      
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
