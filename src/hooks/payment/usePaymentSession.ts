
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
  ): Promise<{ lowProfileCode: string; sessionId: string; terminalNumber: string; cardcomUrl?: string }> => {
    console.log("Initializing payment for:", {
      planId,
      email: paymentUser.email,
      fullName: paymentUser.fullName,
      operationType
    });

    // Get registration data for sending to the edge function
    const registrationData = sessionStorage.getItem('registration_data');
    let parsedRegistrationData = null;
    if (registrationData) {
      try {
        parsedRegistrationData = JSON.parse(registrationData);
      } catch (e) {
        console.error("Error parsing registration data:", e);
      }
    }

    // Determine operation based on plan and operationType
    let amount = 0;
    let operation = "ChargeOnly";
    if (operationType === 'token_only' || planId === 'monthly') {
      operation = "CreateTokenOnly";
      amount = planId === 'monthly' ? 0 : 0; // Free trial for monthly
    } else if (planId === 'annual') {
      amount = 3371;
      operation = "ChargeAndCreateToken";
    } else if (planId === 'vip') {
      amount = 13121;
      operation = "ChargeOnly";
    }

    console.log("Calling cardcom-payment edge function with:", {
      planId,
      amount,
      operation,
      userId
    });

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
        operationType: operation,
        redirectUrls: {
          success: `${window.location.origin}/subscription/success`,
          failed: `${window.location.origin}/subscription/failed`
        },
        userId: userId,
        registrationData: parsedRegistrationData
      }
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
      paymentStatus: PaymentStatus.IDLE,
      isReady: true
    }));
    
    return { 
      lowProfileCode: data.data.lowProfileCode, 
      sessionId: data.data.sessionId,
      terminalNumber: terminalNumber,
      cardcomUrl: data.data.cardcomUrl
    };
  };

  return { initializePaymentSession };
};
