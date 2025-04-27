
import { useState, useCallback } from 'react';
import { PaymentSessionData } from '@/components/payment/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

interface UsePaymentSessionProps {
  setState: React.Dispatch<React.SetStateAction<any>>;
}

export const usePaymentSession = ({ setState }: UsePaymentSessionProps) => {
  const [isInitializing, setIsInitializing] = useState(false);
  
  const initializePaymentSession = useCallback(async (
    planId: string,
    userId: string | null,
    userDetails: { email: string; fullName: string },
    operationType: 'payment' | 'token_only'
  ): Promise<PaymentSessionData> => {
    try {
      setIsInitializing(true);
      PaymentLogger.log('Initializing payment session', { planId, operationType });
      
      // In a real implementation, this would call an edge function to initialize a session with CardCom
      // For now, we'll use mock data
      const sessionId = `session-${Date.now()}`;
      const lowProfileCode = `profile-${Date.now()}`;
      const reference = `ref-${Date.now()}`;
      
      // Simulate a delay like a real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const sessionData: PaymentSessionData = {
        lowProfileCode,
        sessionId,
        terminalNumber: '160138', // This should come from config
        reference,
        cardcomUrl: 'https://secure.cardcom.solutions'
      };
      
      PaymentLogger.log('Payment session initialized successfully', sessionData);
      
      return sessionData;
    } catch (error) {
      PaymentLogger.error('Error initializing payment session:', error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [setState]);
  
  return { initializePaymentSession, isInitializing };
};
