
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
    console.log('Starting payment initialization process for plan:', planId);
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.INITIALIZING 
    }));
    
    try {
      // Step 1: Get and validate registration data
      const { userId, userEmail, fullName } = await handleRegistrationData();
      console.log('Registration data loaded:', { userId, userEmail, fullName });
      
      if (!userId || !userEmail) {
        console.error("No user ID or email found for payment");
        throw new Error('חסרים פרטי משתמש לביצוע התשלום');
      }

      // Step 2: Validate contract
      const contractDetails = validateContract();
      console.log('Contract validation result:', Boolean(contractDetails));
      if (!contractDetails) {
        console.error("Contract validation failed");
        throw new Error('נדרש לחתום על החוזה לפני ביצוע תשלום');
      }

      // Step 3: Initialize payment session to get lowProfileCode
      console.log('Initializing payment session with plan:', planId);
      const paymentData = await initializePaymentSession(
        planId,
        userId,
        { email: userEmail, fullName: fullName },
        operationType
      );
      
      if (!paymentData || !paymentData.lowProfileCode) {
        console.error("Failed to initialize payment session or missing lowProfileCode", paymentData);
        throw new Error('שגיאה באתחול התשלום - חסר מזהה ייחודי לעסקה');
      }
      
      console.log('Payment session initialized successfully:', {
        lowProfileCode: paymentData.lowProfileCode,
        sessionId: paymentData.sessionId,
        terminalNumber: paymentData.terminalNumber
      });
      
      // Set initial payment state to let UI know we're ready to proceed
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.IDLE,
        isFramesReady: false
      }));
      
      // Step 4: Initialize CardCom fields with the lowProfileCode
      // We need to ensure master frame is loaded before initialization
      setTimeout(async () => {
        try {
          console.log('Starting CardCom fields initialization');
          const initialized = await initializeCardcomFields(
            masterFrameRef, 
            paymentData.lowProfileCode, 
            paymentData.sessionId,
            paymentData.terminalNumber,
            operationType
          );
          
          if (!initialized) {
            console.error("Failed to initialize CardCom fields");
            setState(prev => ({ ...prev, isFramesReady: false }));
            toast.error('שגיאה באתחול שדות התשלום, נא לנסות שוב');
          } else {
            console.log('CardCom fields initialized successfully');
            setState(prev => ({ ...prev, isFramesReady: true }));
          }
        } catch (error) {
          console.error('Error during CardCom field initialization:', error);
          setState(prev => ({ 
            ...prev, 
            isFramesReady: false,
            paymentStatus: PaymentStatus.FAILED 
          }));
          toast.error('שגיאה באתחול שדות התשלום');
        }
      }, 500); // Short delay to ensure master frame is loaded
      
      return paymentData;
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      
      // If error is related to missing user data, redirect to auth page
      if (error.message?.includes('חסרים פרטי משתמש') || !userId) {
        console.log('Redirecting to auth page due to missing user data');
        // Store current plan selection in session storage for later use
        try {
          sessionStorage.setItem('selected_plan', planId);
        } catch (e) {
          console.error('Error storing selected plan:', e);
        }
        
        // Redirect delay to allow toast to be seen
        setTimeout(() => {
          window.location.href = '/auth';
        }, 1500);
      }
      
      return null;
    }
  };

  return { initializePayment };
};
