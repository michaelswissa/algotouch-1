
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

export const usePaymentInitialization = ({
  planId,
  setState,
  masterFrameRef,
  operationType = 'payment'
}: UsePaymentInitializationProps) => {
  const { handleRegistrationData } = useRegistrationHandler();
  const { validateContract } = useContractValidation();
  const { initializePaymentSession } = usePaymentSession({ setState });

  const initializePayment = async () => {
    console.log('Starting payment initialization process');
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.INITIALIZING 
    }));
    
    try {
      // Step 1: Get and validate registration data
      const { userId, userEmail, fullName } = await handleRegistrationData();
      console.log('Registration data loaded:', { userId, userEmail, fullName });
      
      if (!userEmail) {
        console.error("No user email found for payment");
        throw new Error('חסרים פרטי משתמש לביצוע התשלום');
      }

      // Step 2: Validate contract
      const contractDetails = validateContract();
      console.log('Contract validation:', Boolean(contractDetails));
      if (!contractDetails) {
        console.error("Contract validation failed");
        throw new Error('נדרש לחתום על החוזה לפני ביצוע תשלום');
      }

      // Step 3: Initialize payment session with proper error handling
      console.log('Initializing payment session with plan:', planId);
      const paymentData = await initializePaymentSession(
        planId,
        userId,
        { email: userEmail, fullName: fullName || userEmail },
        operationType
      );
      
      if (!paymentData?.lowProfileId) {
        console.error("Missing lowProfileId in payment data:", paymentData);
        throw new Error('שגיאה באתחול התשלום - חסר מזהה ייחודי לעסקה');
      }
      
      console.log('Payment session initialized:', {
        lowProfileId: paymentData.lowProfileId,
        sessionId: paymentData.sessionId,
        terminalNumber: paymentData.terminalNumber,
        cardcomUrl: paymentData.cardcomUrl
      });

      // Set initial payment state after payment session initialization
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.IDLE,
        lowProfileId: paymentData.lowProfileId,
        sessionId: paymentData.sessionId,
        terminalNumber: paymentData.terminalNumber,
        cardcomUrl: paymentData.cardcomUrl || 'https://secure.cardcom.solutions',
        isReady: true,
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
