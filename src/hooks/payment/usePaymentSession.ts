
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
  ): Promise<{ lowProfileCode: string; sessionId: string; terminalNumber: string; reference: string; operation: string }> => {
    console.log("Initializing payment for:", {
      planId,
      email: paymentUser.email,
      fullName: paymentUser.fullName,
      operationType
    });

    // Determine amount based on plan
    let amount = 0;
    if (planId === 'monthly' && operationType !== 'token_only') {
      amount = 371;
    } else if (planId === 'annual') {
      amount = 3371;
    } else if (planId === 'vip') {
      amount = 13121;
    }
    
    // For monthly plans or token_only operation, we only validate the card without charging
    if (operationType === 'token_only' || planId === 'monthly') {
      console.log("This is a token creation operation, no immediate charge");
      amount = 0;  // No charge for token creation
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
        operationType: operationType,
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
    
    if (!data.data || !data.data.lowProfileCode) {
      console.error("Missing lowProfileCode in payment session response");
      throw new Error('חסר מזהה יחודי לעסקה בתגובה מהשרת');
    }
    
    // Always use the fixed terminal number for CardCom
    const terminalNumber = data.data.terminalNumber || '160138';
    
    setState(prev => ({
      ...prev,
      sessionId: data.data.sessionId,
      lowProfileCode: data.data.lowProfileCode,
      terminalNumber: terminalNumber,
      cardcomUrl: data.data.cardcomUrl || 'https://secure.cardcom.solutions',
      reference: data.data.reference || '',
      operation: data.data.operation || 'ChargeOnly',
      paymentStatus: PaymentStatus.IDLE
    }));
    
    return { 
      lowProfileCode: data.data.lowProfileCode, 
      sessionId: data.data.sessionId,
      terminalNumber: terminalNumber,
      reference: data.data.reference || '',
      operation: data.data.operation || 'ChargeOnly'
    };
  };

  return { initializePaymentSession };
};
