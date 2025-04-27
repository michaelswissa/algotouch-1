
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { CardComService } from '@/services/payment/CardComService';

interface UsePaymentSessionProps {
  setState: (updater: any) => void;
}

export const usePaymentSession = ({ setState }: UsePaymentSessionProps) => {
  const initializePaymentSession = async (
    planId: string,
    userId: string | null,
    paymentUser: { email: string; fullName: string },
    operationType: 'payment' | 'token_only' = 'payment'
  ): Promise<{ lowProfileCode: string; sessionId: string; terminalNumber: string; reference: string }> => {
    PaymentLogger.log("Initializing payment for:", {
      planId,
      email: paymentUser.email,
      fullName: paymentUser.fullName,
      operationType
    });

    try {
      // Use CardComService to initialize payment
      const sessionData = await CardComService.initializePayment({
        planId,
        userId,
        email: paymentUser.email,
        fullName: paymentUser.fullName,
        operationType
      });
      
      // Update state with the new session data
      setState(prev => ({
        ...prev,
        sessionId: sessionData.sessionId,
        lowProfileCode: sessionData.lowProfileCode,
        terminalNumber: sessionData.terminalNumber,
        cardcomUrl: sessionData.cardcomUrl,
        reference: sessionData.reference,
        paymentStatus: PaymentStatus.IDLE
      }));
      
      return sessionData;
    } catch (error) {
      PaymentLogger.error("Payment initialization error:", error);
      toast.error(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
      throw error;
    }
  };

  return { initializePaymentSession };
};
