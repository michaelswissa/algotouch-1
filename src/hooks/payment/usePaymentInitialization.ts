
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
    console.log('Starting payment initialization process');
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

      // Step 3: Determine operation type based on plan
      // Monthly plans only need token creation, with first charge after trial
      const effectiveOperationType = planId === 'monthly' ? 'token_only' : operationType;
      
      // Step 4: Initialize payment session to get lowProfileCode
      console.log('Initializing payment session with plan:', planId, 'operationType:', effectiveOperationType);
      const paymentData = await initializePaymentSession(
        planId,
        userId,
        { email: userEmail, fullName: fullName || userEmail },
        effectiveOperationType
      );
      
      if (!paymentData || !paymentData.lowProfileCode) {
        console.error("Failed to initialize payment session or missing lowProfileCode", paymentData);
        throw new Error('שגיאה באתחול התשלום - חסר מזהה ייחודי לעסקה');
      }
      
      console.log('Payment session initialized with lowProfileCode:', paymentData.lowProfileCode);

      // Step 5: Master frame should be loaded by the parent component
      // We must ensure the iframes are ready before initialization
      
      // Set initial payment state
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.IDLE,
        operationType: effectiveOperationType
      }));
      
      // Step 6: Initialize CardCom fields with the lowProfileCode
      console.log('Setting up to initialize CardCom fields');
      setTimeout(async () => {
        console.log('Starting CardCom fields initialization');
        try {
          const initialized = await initializeCardcomFields(
            masterFrameRef, 
            paymentData.lowProfileCode, 
            paymentData.sessionId,
            paymentData.terminalNumber,
            effectiveOperationType
          );
          
          if (!initialized) {
            console.error("Failed to initialize CardCom fields");
            throw new Error('שגיאה באתחול שדות התשלום');
          }
          
          console.log('CardCom fields initialized successfully');
          setState(prev => ({
            ...prev,
            isFramesReady: true
          }));
        } catch (error) {
          console.error('Error during CardCom field initialization:', error);
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          toast.error(error.message || 'שגיאה באתחול שדות התשלום');
        }
      }, 500); // Short delay to ensure master frame is loaded
      
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
