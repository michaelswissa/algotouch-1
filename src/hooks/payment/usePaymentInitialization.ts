
import { useCallback } from 'react';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentStatusEnum } from '@/types/payment';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth/useAuth';
import { StorageService } from '@/services/storage/StorageService';
import type { ContractData } from '@/lib/contracts/contract-validation-service';

interface UsePaymentInitializationProps {
  planId: string;
  setState: (state: any) => void;
  operationType: 'payment' | 'token_only';
}

export const usePaymentInitialization = ({
  planId,
  setState,
  operationType
}: UsePaymentInitializationProps) => {
  const { user } = useAuth();

  const initializePayment = useCallback(async () => {
    try {
      PaymentLogger.log('Initializing payment', { planId, operationType });
      
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatusEnum.INITIALIZING 
      }));
      
      const contractData = StorageService.get<ContractData>('contract_data');
      if (!contractData) {
        throw new Error('נדרש למלא את פרטי החוזה לפני ביצוע תשלום');
      }

      if (!contractData.email || !contractData.fullName) {
        throw new Error('חסרים פרטי לקוח בחוזה');
      }
      
      const sessionData = await CardComService.initializePayment({
        planId,
        userId: user?.id || null,
        email: contractData.email,
        fullName: contractData.fullName,
        operationType
      });
      
      PaymentLogger.log('Payment initialized successfully', sessionData);
      
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatusEnum.IDLE,
        lowProfileCode: sessionData.lowProfileCode,
        sessionId: sessionData.sessionId,
        reference: sessionData.reference,
        terminalNumber: sessionData.terminalNumber,
        cardcomUrl: sessionData.cardcomUrl || 'https://secure.cardcom.solutions'
      }));
      
      return true;
    } catch (error) {
      PaymentLogger.error('Error initializing payment:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'שגיאה לא ידועה באתחול תהליך התשלום';
      
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatusEnum.FAILED,
        error: errorMessage
      }));
      
      toast.error(errorMessage);
      return false;
    }
  }, [planId, setState, operationType, user?.id]);

  return {
    initializePayment
  };
};
