
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
  ): Promise<{ lowProfileCode: string; sessionId: string; terminalNumber: string }> => {
    console.log("Initializing payment for:", {
      planId,
      email: paymentUser.email,
      fullName: paymentUser.fullName,
      operationType
    });

    // Create the payload once before sending
    const payload = {
      planId,
      amount: planId === 'monthly' ? 371 : planId === 'annual' ? 3371 : 13121,
      invoiceInfo: {
        fullName: paymentUser.fullName || paymentUser.email,
        email: paymentUser.email,
      },
      currency: "ILS",
      operation: operationType === 'token_only' || planId === 'monthly' ? "ChargeAndCreateToken" : "ChargeOnly",
      redirectUrls: {
        success: `${window.location.origin}/subscription/success`,
        failed: `${window.location.origin}/subscription/failed`
      },
      userId: userId,
      operationType,
      registrationData: sessionStorage.getItem('registration_data') 
        ? JSON.parse(sessionStorage.getItem('registration_data')!) 
        : null
    };

    // Call CardCom payment initialization Edge Function
    const { data, error } = await supabase.functions.invoke('cardcom-payment', {
      body: payload
    });
    
    if (error || !data?.success) {
      console.error("Payment initialization error:", error || data?.message);
      throw new Error(error?.message || data?.message || 'אירעה שגיאה באתחול התשלום');
    }
    
    console.log("Payment session created:", data.data);
    
    // Always use the fixed terminal number for CardCom
    const terminalNumber = '160138';
    
    setState(prev => ({
      ...prev,
      sessionId: data.data.sessionId,
      lowProfileCode: data.data.lowProfileCode,
      terminalNumber: terminalNumber,
      cardcomUrl: data.data.cardcomUrl || 'https://secure.cardcom.solutions',
      paymentStatus: PaymentStatus.IDLE
    }));
    
    return { 
      lowProfileCode: data.data.lowProfileCode, 
      sessionId: data.data.sessionId,
      terminalNumber: terminalNumber
    };
  };

  return { initializePaymentSession };
};
