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
    console.log('Starting payment initialization process for plan:', planId);
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.INITIALIZING 
    }));
    
    try {
      // Step 1: Get and validate registration data
      const { userId, userEmail, fullName } = await handleRegistrationData();
      console.log('Registration data loaded:', { userId, userEmail });
      
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

      // Determine operation type based on plan
      let paymentOpType: 'payment' | 'token_only' = 'payment';
      if (planId === 'monthly') {
        paymentOpType = 'token_only';
      }

      // Step 3: Initialize payment session to get lowProfileCode
      console.log('Initializing payment session with plan:', planId);
      const paymentData = await initializePaymentSession(
        planId,
        userId,
        { email: userEmail, fullName: fullName || userEmail },
        paymentOpType
      );
      
      if (!paymentData || !paymentData.lowProfileCode) {
        console.error("Failed to initialize payment session or missing lowProfileCode", paymentData);
        throw new Error('שגיאה באתחול התשלום - חסר מזהה ייחודי לעסקה');
      }
      
      console.log('Payment session initialized with lowProfileCode:', paymentData.lowProfileCode);
      
      // Set initial payment state
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.IDLE,
        lowProfileCode: paymentData.lowProfileCode,
        sessionId: paymentData.sessionId,
        terminalNumber: paymentData.terminalNumber
      }));
      
      // Initialize CardCom fields with proper timing
      setTimeout(async () => {
        try {
          const initialized = await initializeCardcomFields(
            masterFrameRef, 
            paymentData.lowProfileCode, 
            paymentData.sessionId,
            paymentData.terminalNumber.toString(),
            paymentOpType,
            planId
          );
          
          if (!initialized) {
            throw new Error('שגיאה באתחול שדות התשלום');
          }
          
          console.log('CardCom fields initialized successfully');
        } catch (error) {
          console.error('Error during CardCom field initialization:', error);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error(error instanceof Error ? error.message : 'שגיאה באתחול שדות התשלום');
        }
      }, 500);
      
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
