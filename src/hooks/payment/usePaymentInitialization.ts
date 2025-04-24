
import { PaymentStatus } from '@/components/payment/types/payment';
import { useRegistrationHandler } from './useRegistrationHandler';
import { useContractValidation } from './useContractValidation';
import { usePaymentSession } from './usePaymentSession';
import { toast } from 'sonner';

interface UsePaymentInitializationProps {
  planId: string;
  setState: (updater: any) => void;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  operationType?: 'payment' | 'token_only';
}

export const usePaymentInitialization = ({ planId, setState, operationType = 'payment' }: UsePaymentInitializationProps) => {
  const { handleRegistrationData } = useRegistrationHandler();
  const { validateContract } = useContractValidation();
  const { initializePaymentSession } = usePaymentSession({ setState });

  const initializePayment = async () => {
    console.log('Starting payment initialization for plan:', planId);
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.INITIALIZING 
    }));
    
    try {
      // Step 1: Get and validate registration data
      const { userId, userEmail, fullName } = await handleRegistrationData();
      console.log('Registration data loaded:', { userId, userEmail });
      
      if (!userEmail) {
        throw new Error('חסרים פרטי משתמש לביצוע התשלום');
      }

      // Step 2: Validate contract
      const contractDetails = validateContract();
      if (!contractDetails) {
        throw new Error('נדרש לחתום על החוזה לפני ביצוע תשלום');
      }

      let paymentOpType: 'payment' | 'token_only' = 'payment';
      if (planId === 'monthly') {
        paymentOpType = 'token_only';
      }

      // Step 3: Initialize payment session
      console.log('Initializing payment session with plan:', planId);
      const paymentData = await initializePaymentSession(
        planId,
        userId,
        { email: userEmail, fullName: fullName || userEmail },
        paymentOpType
      );
      
      if (!paymentData?.lowProfileCode) {
        throw new Error('שגיאה באתחול התשלום - חסר מזהה ייחודי לעסקה');
      }
      
      console.log('Payment session initialized successfully:', paymentData);
      
      // Set state with payment data
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.IDLE,
        lowProfileCode: paymentData.lowProfileCode,
        sessionId: paymentData.sessionId,
        terminalNumber: paymentData.terminalNumber
      }));

      return paymentData;
      
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      return null;
    }
  };

  return { initializePayment };
};
