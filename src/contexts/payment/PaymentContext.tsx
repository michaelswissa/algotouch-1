
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PaymentStatus, PaymentStatusType, CardOwnerDetails, PaymentSessionData } from '@/components/payment/types/payment';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CardComService } from '@/services/payment/CardComService';

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
  initializePayment: (planId: string) => Promise<{ success: boolean }>;
  submitPayment: (cardOwnerDetails: CardOwnerDetails) => Promise<{ success: boolean }>;
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
  initializePayment: async () => ({ success: false }),
  submitPayment: async () => ({ success: false }),
  resetPaymentState: () => {},
  setPaymentStatus: () => {},
  setError: () => {},
  updateSessionData: () => {},
});

export const usePaymentContext = () => useContext(PaymentContext);

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PaymentState>(initialState);

  const initializePayment = async (planId: string): Promise<{ success: boolean }> => {
    if (state.lowProfileCode && state.paymentStatus !== PaymentStatus.FAILED) {
      console.log('Payment already initialized with lowProfileCode:', state.lowProfileCode);
      return { success: true };
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
      
      // Fetch registration data
      const registrationData = sessionStorage.getItem('registration_data');
      const parsedRegistrationData = registrationData ? JSON.parse(registrationData) : null;
      
      if (!parsedRegistrationData?.email) {
        throw new Error('חסרים פרטי הרשמה');
      }

      // Initialize payment session with CardCom
      const { data: paymentData, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: planId === 'monthly' ? 371 : planId === 'annual' ? 3371 : 13121,
          operationType,
          userEmail: parsedRegistrationData.email,
          fullName: parsedRegistrationData.userData ? 
            `${parsedRegistrationData.userData.firstName} ${parsedRegistrationData.userData.lastName}`.trim() : 
            undefined
        }
      });

      if (error || !paymentData?.success) {
        throw new Error(error?.message || paymentData?.message || 'אירעה שגיאה באתחול התשלום');
      }

      setState(prev => ({
        ...prev,
        isInitializing: false,
        paymentStatus: PaymentStatus.IDLE,
        operationType,
        sessionId: paymentData.data.sessionId,
        lowProfileCode: paymentData.data.lowProfileCode,
        reference: paymentData.data.reference,
      }));

      return { success: true };
    } catch (error) {
      console.error('Error initializing payment:', error);
      setState(prev => ({ 
        ...prev, 
        isInitializing: false,
        paymentStatus: PaymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Failed to initialize payment'
      }));
      toast.error('אירעה שגיאה באתחול התשלום');
      return { success: false };
    }
  };

  const submitPayment = async (cardOwnerDetails: CardOwnerDetails): Promise<{ success: boolean }> => {
    try {
      if (state.paymentStatus === PaymentStatus.PROCESSING) {
        return { success: false }; // Prevent duplicate submissions
      }

      if (!state.lowProfileCode) {
        toast.error('חסר מזהה ייחודי לעסקה, אנא נסה/י שנית');
        return { success: false };
      }

      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.PROCESSING,
        error: null
      }));
      
      const { data: submitData, error: submitError } = await supabase.functions.invoke('cardcom-submit', {
        body: {
          lowProfileCode: state.lowProfileCode,
          terminalNumber: state.terminalNumber,
          cardOwnerDetails,
          operationType: state.operationType,
          planId: state.planId
        }
      });

      if (submitError || !submitData?.success) {
        throw new Error(submitError?.message || submitData?.message || 'אירעה שגיאה בתהליך התשלום');
      }

      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.SUCCESS,
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error submitting payment:', error);
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Failed to process payment'
      }));
      toast.error('אירעה שגיאה בתהליך התשלום');
      return { success: false };
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
