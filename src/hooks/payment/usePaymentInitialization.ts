
import { PaymentStatus } from '@/components/payment/types/payment';
import { useRegistrationHandler } from './useRegistrationHandler';
import { useCardcomInitializer } from '../useCardcomInitializer';
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
  const { initializeCardcomFields } = useCardcomInitializer();
  const { validateContract } = useContractValidation();
  const { initializePaymentSession } = usePaymentSession({ setState });

  const initializePayment = async () => {
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.INITIALIZING,
      lowProfileCode: '', // Clear any existing lowProfileCode
    }));
    
    try {
      // Get and validate registration data
      const { userId, userEmail, fullName } = await handleRegistrationData();
      console.log('Registration data loaded:', { userId, userEmail });
      
      if (!userEmail) {
        console.error("No user email found for payment");
        throw new Error('חסרים פרטי משתמש לביצוע התשלום');
      }

      // Validate contract
      const contractDetails = validateContract();
      console.log('Contract validation:', Boolean(contractDetails));
      if (!contractDetails) {
        console.error("Contract validation failed");
        throw new Error('נדרש לחתום על החוזה לפני ביצוע תשלום');
      }

      // Initialize payment session
      console.log('Initializing payment session with plan:', planId);
      const paymentData = await initializePaymentSession(
        planId,
        userId,
        { email: userEmail, fullName: fullName || userEmail },
        operationType
      );
      
      if (!paymentData?.lowProfileCode) {
        console.error("Missing lowProfileCode in payment initialization");
        throw new Error('שגיאה באתחול התשלום - חסר קוד זיהוי');
      }
      
      console.log('Payment session initialized:', paymentData);
      
      // Initialize CardCom fields with terminal number
      const initialized = await initializeCardcomFields(
        masterFrameRef, 
        paymentData.lowProfileCode,
        paymentData.sessionId,
        paymentData.terminalNumber,
        operationType
      );
      
      if (!initialized) {
        console.error("Failed to initialize CardCom fields");
        throw new Error('שגיאה באתחול שדות התשלום');
      }
      
      return paymentData;
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      return null;
    }
  };

  return { initializePayment };
};
