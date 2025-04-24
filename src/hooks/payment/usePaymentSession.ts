
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UsePaymentSessionProps {
  setState: (updater: any) => void;
}

export const usePaymentSession = ({ setState }: UsePaymentSessionProps) => {
  const initializePaymentSession = async (
    planId: string,
    userId: string | null,
    paymentUser: { email: string; fullName: string },
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
    console.log("Initializing payment for:", {
      planId,
      email: paymentUser.email,
      fullName: paymentUser.fullName,
      operationType
    });

    try {
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: planId === 'monthly' ? 371 : planId === 'annual' ? 3371 : 13121,
          invoiceInfo: {
            fullName: paymentUser.fullName || paymentUser.email,
            email: paymentUser.email,
          },
          currency: "ILS",
          operationType,
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
      
      if (error || !data?.success || !data.data?.lowProfileId) {
        console.error("Payment initialization error:", error || data?.message);
        throw new Error(error?.message || data?.message || 'אירעה שגיאה באתחול התשלום');
      }
      
      console.log("Payment session created:", data.data);
      return data.data;
    } catch (error) {
      console.error("Payment initialization error:", error);
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      throw error;
    }
  };

  return { initializePaymentSession };
};
