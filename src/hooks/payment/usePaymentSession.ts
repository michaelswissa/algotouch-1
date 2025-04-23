
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

    // Determine amount and operation based on plan type
    let amount = 0;
    let operation = "ChargeOnly";
    
    if (planId === 'monthly') {
      // Monthly plan: token first, then charge later (371₪)
      amount = 0; // No immediate charge
      operation = "CreateTokenOnly";
    } else if (planId === 'annual') {
      // Annual plan: charge 3,371₪ and create token
      amount = 3371;
      operation = "ChargeAndCreateToken";
    } else if (planId === 'vip') {
      // VIP plan: one-time charge of 13,121₪
      amount = 13121;
      operation = "ChargeOnly";
    }

    // Call CardCom payment initialization Edge Function
    const { data, error } = await supabase.functions.invoke('cardcom-payment', {
      body: {
        planId,
        amount: amount,
        invoiceInfo: {
          fullName: paymentUser.fullName || paymentUser.email,
          email: paymentUser.email,
        },
        currency: "ILS",
        operation: operation,
        redirectUrls: {
          success: planId === 'monthly' 
            ? `${window.location.origin}/token-success`
            : `${window.location.origin}/payment-success`,
          failed: planId === 'monthly'
            ? `${window.location.origin}/token-failed`
            : `${window.location.origin}/payment-failed`
        },
        userId: userId,
        operationType,
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
    
    // CardCom terminal number as provided
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
