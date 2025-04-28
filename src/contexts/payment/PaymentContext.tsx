import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PaymentStatus, PaymentStatusType, CardOwnerDetails, PaymentSessionData } from '@/components/payment/types/payment';
import { toast } from 'sonner';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { useAuth } from '@/contexts/auth/useAuth';
import { StorageService } from '@/lib/subscription/storage-service';
import type { ContractData } from '@/lib/contracts/contract-validation-service';

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
  terminalNumber: '',  // Will be set from API response
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
  const { user } = useAuth();

  const initializePayment = async (planId: string): Promise<boolean> => {
    if (state.lowProfileCode && state.paymentStatus !== PaymentStatus.FAILED) {
      PaymentLogger.log('Payment already initialized with lowProfileCode:', state.lowProfileCode);
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

      const contractData = StorageService.get<ContractData>('contract_data');
      if (!contractData) {
        throw new Error('נדרש למלא את פרטי החוזה לפני ביצוע תשלום');
      }

      if (!contractData.email || !contractData.fullName) {
        throw new Error('חסרים פרטי לקוח בחוזה');
      }

      const operationType = planId === 'monthly' ? 'token_only' : 'payment';

      const sessionData = await CardComService.initializePayment({
        planId,
        userId: user?.id || null,
        email: contractData.email,
        fullName: contractData.fullName,
        operationType
      });

      setState(prev => ({
        ...prev,
        isInitializing: false,
        paymentStatus: PaymentStatus.IDLE,
        operationType,
        sessionId: sessionData.sessionId,
        lowProfileCode: sessionData.lowProfileId,
        reference: sessionData.reference,
        terminalNumber: sessionData.terminalNumber,
        cardcomUrl: sessionData.cardcomUrl || prev.cardcomUrl,
      }));

      PaymentLogger.log('Payment initialized successfully', sessionData);
      return true;
    } catch (error) {
      console.error('Error initializing payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'שגיאה באתחול התשלום';
      setState(prev => ({ 
        ...prev, 
        isInitializing: false,
        paymentStatus: PaymentStatus.FAILED,
        error: errorMessage
      }));
      toast.error(errorMessage);
      return false;
    }
  };

  const submitPayment = async (cardOwnerDetails: CardOwnerDetails): Promise<boolean> => {
    try {
      if (state.paymentStatus === PaymentStatus.PROCESSING) {
        return false;
      }

      if (!state.lowProfileCode || !state.terminalNumber) {
        toast.error('חסר מזהה ייחודי לעסקה, אנא נסה/י שנית');
        return false;
      }

      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.PROCESSING,
        error: null
      }));
      
      const success = await CardComService.submitPayment({
        lowProfileCode: state.lowProfileCode,
        terminalNumber: state.terminalNumber,
        operationType: state.operationType,
        cardOwnerDetails
      });

      if (success) {
        setState(prev => ({
          ...prev,
          paymentStatus: PaymentStatus.SUCCESS,
        }));
        PaymentLogger.log('Payment submitted successfully');
        return true;
      } else {
        throw new Error('שגיאה בשליחת פרטי התשלום');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'שגיאה בתהליך התשלום';
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.FAILED,
        error: errorMessage
      }));
      toast.error(errorMessage);
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
