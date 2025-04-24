
import { PaymentStatus } from '@/components/payment/types/payment';
import { useRegistrationHandler } from './useRegistrationHandler';
import { useCardcomInitializer } from './useCardcomInitializer';
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

      // Step 3: Initialize payment session with proper error handling
      console.log('Initializing payment session with plan:', planId);
      const paymentData = await initializePaymentSession(
        planId,
        userId,
        { email: userEmail, fullName: fullName || userEmail },
        operationType
      );
      
      if (!paymentData?.lowProfileCode) {
        console.error("Missing lowProfileCode in payment data:", paymentData);
        throw new Error('שגיאה באתחול התשלום - חסר מזהה ייחודי לעסקה');
      }
      
      console.log('Payment session initialized:', {
        lowProfileCode: paymentData.lowProfileCode,
        sessionId: paymentData.sessionId,
        terminalNumber: paymentData.terminalNumber
      });

      // Set initial payment state before iframe initialization
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.IDLE,
        lowProfileCode: paymentData.lowProfileCode,
        sessionId: paymentData.sessionId,
        terminalNumber: paymentData.terminalNumber,
        cardcomUrl: paymentData.cardcomUrl || 'https://secure.cardcom.solutions'
      }));
      
      // Wait for master frame to be available
      setTimeout(async () => {
        if (!masterFrameRef.current) {
          throw new Error('מסגרת התשלום אינה זמינה');
        }
        
        console.log('Initializing CardCom fields');
        const initialized = await initializeCardcomFields(
          masterFrameRef,
          paymentData.lowProfileCode,
          paymentData.sessionId,
          paymentData.terminalNumber,
          operationType
        );
        
        if (!initialized) {
          throw new Error('שגיאה באתחול שדות התשלום');
        }
        
        console.log('CardCom fields initialized successfully');
      }, 500);
      
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
