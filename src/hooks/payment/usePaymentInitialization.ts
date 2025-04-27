
import { PaymentStatus } from '@/components/payment/types/payment';
import { RegistrationService } from '@/services/registration/RegistrationService';
import { CardComService } from '@/services/payment/CardComService';
import { useContractValidation } from './useContractValidation';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

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
  const { validateContract } = useContractValidation();

  const initializePayment = async () => {
    PaymentLogger.log('Starting payment initialization process', { planId, operationType });
    
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.INITIALIZING 
    }));
    
    try {
      // Step 1: Get and validate registration data
      const registrationData = RegistrationService.getValidRegistrationData();
      
      if (!registrationData) {
        throw new Error('מידע הרשמה חסר או לא תקין');
      }
      
      PaymentLogger.log('Registration data loaded', { 
        email: registrationData.email,
        hasUserData: !!registrationData.userData
      });
      
      // Step 2: Create user if not already created
      let user: User | null = null;
      
      if (!registrationData.userCreated) {
        PaymentLogger.log('User not created yet, creating user account');
        const { success, user: createdUser, error } = await RegistrationService.createUserAccount(registrationData);
        
        if (!success || !createdUser) {
          throw new Error(error || 'שגיאה ביצירת חשבון המשתמש');
        }
        
        user = createdUser;
        PaymentLogger.log('User created successfully for payment', { userId: user.id });
      } else {
        // Get current user
        user = await RegistrationService.getCurrentUser();
        if (!user && registrationData.email && registrationData.password) {
          PaymentLogger.log('User already created but not authenticated, attempting to sign in');
          const { success, user: signedInUser, error } = 
            await RegistrationService.createUserAccount(registrationData);
          
          if (success && signedInUser) {
            user = signedInUser;
          } else {
            PaymentLogger.error('Failed to get authenticated user', { error });
          }
        }
      }
      
      // Step 3: Validate contract
      const contractDetails = validateContract();
      if (!contractDetails) {
        throw new Error('נדרש לחתום על החוזה לפני ביצוע תשלום');
      }
      
      // Step 4: Initialize payment session
      const fullName = contractDetails.fullName || 
        `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim();
      
      const email = contractDetails.email || registrationData.email;
      
      const paymentData = await CardComService.initializePayment({
        planId,
        userId: user?.id || null,
        email,
        fullName,
        operationType
      });
      
      // Set initial payment state
      setState(prev => ({ 
        ...prev, 
        lowProfileCode: paymentData.lowProfileCode,
        sessionId: paymentData.sessionId,
        terminalNumber: paymentData.terminalNumber,
        cardcomUrl: paymentData.cardcomUrl,
        reference: paymentData.reference,
        paymentStatus: PaymentStatus.IDLE
      }));
      
      // Ensure master frame is set up
      if (!masterFrameRef.current) {
        PaymentLogger.error('Master frame reference is not available');
        throw new Error('שגיאה באתחול מסגרת התשלום');
      }
      
      return paymentData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה באתחול התשלום';
      PaymentLogger.error('Payment initialization error:', error);
      toast.error(errorMessage);
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      return null;
    }
  };

  return { initializePayment };
};
