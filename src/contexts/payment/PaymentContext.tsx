
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PaymentStatus, PaymentStatusType, CardOwnerDetails } from '@/types/payment';
import { toast } from 'sonner';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { useAuth } from '@/contexts/auth/useAuth';
import { StorageService } from '@/services/storage/StorageService';
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
  submitPayment: () => void;
  resetPaymentState: () => void;
  setPaymentStatus: (status: PaymentStatusType) => void;
  setError: (error: string | null) => void;
}

const initialState: PaymentState = {
  paymentStatus: PaymentStatus.IDLE,
  isInitializing: false,
  terminalNumber: '',
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
  submitPayment: () => {},
  resetPaymentState: () => {},
  setPaymentStatus: () => {},
  setError: () => {},
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

  // Updated to use CardCom 3DS directly
  const submitPayment = () => {
    try {
      if (state.paymentStatus === PaymentStatus.PROCESSING) {
        return;
      }

      if (!state.lowProfileCode) {
        toast.error('חסר מזהה ייחודי לעסקה, אנא נסה/י שנית');
        return;
      }

      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.PROCESSING,
        error: null
      }));
      
      // Validate that required user fields are filled
      const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
      const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
      
      // Validate user input fields
      if (!cardholderName) {
        toast.error("נא להזין שם בעל כרטיס");
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
        return;
      }
      
      if (!cardOwnerId || cardOwnerId.length !== 9) {
        toast.error("תעודת זהות חייבת להכיל 9 ספרות");
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
        return;
      }
      
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        toast.error("נא להזין כתובת אימייל תקינה");
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
        return;
      }
      
      if (!phone || !/^0\d{8,9}$/.test(phone.replace(/[-\s]/g, ''))) {
        toast.error("נא להזין מספר טלפון תקין");
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
        return;
      }

      // Use the cardcom3DS global object to handle the payment
      if (window.cardcom3DS) {
        PaymentLogger.log('Using CardCom 3DS to process payment', { lowProfileCode: state.lowProfileCode });
        
        // Validate fields first
        const isValid = window.cardcom3DS.validateFields();
        
        if (isValid) {
          // Process the payment using the cardcom3DS global object
          window.cardcom3DS.doPayment(state.lowProfileCode);
          PaymentLogger.log('Payment request sent to CardCom 3DS');
        } else {
          PaymentLogger.error('CardCom 3DS field validation failed');
          toast.error("אנא וודא שפרטי כרטיס האשראי הוזנו כראוי");
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
        }
      } else {
        PaymentLogger.error('CardCom 3DS script not available');
        toast.error("שגיאה בטעינת מערכת הסליקה, אנא רענן את הדף ונסה שנית");
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
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

  const contextValue: PaymentContextType = {
    ...state,
    initializePayment,
    submitPayment,
    resetPaymentState,
    setPaymentStatus,
    setError,
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
};
