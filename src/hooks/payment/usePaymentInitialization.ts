
import { useCallback, useState } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { usePaymentSession } from './usePaymentSession';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { CardComService } from '@/services/payment/CardComService';

interface UsePaymentInitializationProps {
  planId: string;
  setState: React.Dispatch<React.SetStateAction<any>>;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  operationType: 'payment' | 'token_only';
}

export const usePaymentInitialization = ({
  planId,
  setState,
  masterFrameRef,
  operationType
}: UsePaymentInitializationProps) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const { initializePaymentSession } = usePaymentSession({ setState });
  
  const initializePayment = useCallback(async () => {
    if (isInitializing) {
      return;
    }
    
    try {
      setIsInitializing(true);
      setState(prev => ({ 
        ...prev, 
        isInitializing: true,
        paymentStatus: PaymentStatus.INITIALIZING,
        error: null
      }));
      
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
      
      // Initialize payment session
      const sessionData = await initializePaymentSession(
        planId,
        userId,
        { email, fullName },
        operationType
      );
      
      setState(prev => ({
        ...prev,
        lowProfileCode: sessionData.lowProfileCode,
        sessionId: sessionData.sessionId,
        terminalNumber: sessionData.terminalNumber,
        isInitializing: false,
        paymentStatus: PaymentStatus.IDLE
      }));
      
      PaymentLogger.log('Payment session initialized', sessionData);
      return true;
    } catch (error) {
      console.error('Error initializing payment:', error);
      setState(prev => ({
        ...prev,
        isInitializing: false,
        paymentStatus: PaymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Failed to initialize payment'
      }));
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [planId, setState, initializePaymentSession, isInitializing, operationType]);
  
  return { initializePayment, isInitializing };
};
