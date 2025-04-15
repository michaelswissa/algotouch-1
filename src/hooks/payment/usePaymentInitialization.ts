
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentStatus } from '@/components/payment/types/payment';
import { useRegistrationHandler } from './useRegistrationHandler';
import { useCardcomInitializer } from './useCardcomInitializer';

interface UsePaymentInitializationProps {
  planId: string;
  setState: (updater: any) => void;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
}

export const usePaymentInitialization = ({
  planId,
  setState,
  masterFrameRef
}: UsePaymentInitializationProps) => {
  const navigate = useNavigate();
  const { handleRegistrationData } = useRegistrationHandler();
  const { initializeCardcomFields } = useCardcomInitializer();

  const initializePayment = async () => {
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.INITIALIZING 
    }));
    
    try {
      const { userId, userEmail, fullName } = await handleRegistrationData();
      
      if (!userEmail) {
        console.error("No user email found for payment");
        throw new Error('חסרים פרטי משתמש לביצוע התשלום');
      }

      // Get contract data - required before payment
      const contractData = sessionStorage.getItem('contract_data');
      const contractDetails = contractData ? JSON.parse(contractData) : null;

      if (!contractDetails) {
        console.error("Missing contract data");
        toast.error('נדרשת חתימה על החוזה');
        navigate('/subscription');
        return;
      }

      // Prepare payment user info
      const paymentUser = {
        email: userEmail,
        fullName: fullName || userEmail
      };

      console.log("Initializing payment for:", {
        planId,
        email: paymentUser.email,
        fullName: paymentUser.fullName
      });

      // Call CardCom payment initialization Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: planId === 'monthly' ? 371 : planId === 'annual' ? 3371 : 13121,
          invoiceInfo: {
            fullName: paymentUser.fullName || paymentUser.email,
            email: paymentUser.email,
          },
          currency: "ILS",
          operation: "ChargeAndCreateToken",
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          userId: userId,
          registrationData: sessionStorage.getItem('registration_data') 
            ? JSON.parse(sessionStorage.getItem('registration_data')!) 
            : null
        }
      });
      
      if (error || !data?.success) {
        console.error("Payment initialization error:", error || data?.message);
        throw new Error(error?.message || data?.message || 'אירעה שגיאה באתחול התשלום');
      }
      
      console.log("Payment session created:", data.data);
      
      setState(prev => ({
        ...prev,
        sessionId: data.data.sessionId,
        lowProfileCode: data.data.lowProfileCode,
        terminalNumber: data.data.terminalNumber,
        cardcomUrl: data.data.cardcomUrl || 'https://secure.cardcom.solutions',
        paymentStatus: PaymentStatus.IDLE
      }));
      
      // Initialize CardCom fields with improved iframe handling
      initializeCardcomFields(masterFrameRef, data.data.lowProfileCode, data.data.sessionId);
      
      return { 
        lowProfileCode: data.data.lowProfileCode, 
        sessionId: data.data.sessionId 
      };
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      return null;
    }
  };

  return { initializePayment };
};
