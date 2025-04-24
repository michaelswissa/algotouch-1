
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UsePaymentSessionProps {
  setState: (updater: any) => void;
}

export const usePaymentSession = ({ setState }: UsePaymentSessionProps) => {
  const initializePaymentSession = async (
    planId: string,
    userId: string,
    paymentUser: { email: string; fullName: string },
    operationType: 'payment' | 'token_only' = 'payment'
  ): Promise<{ lowProfileCode: string; sessionId: string; terminalNumber: string }> => {
    console.log("Initializing payment for:", {
      planId,
      email: paymentUser.email,
      fullName: paymentUser.fullName,
      operationType,
      userId
    });

    if (!planId) {
      console.error("Missing plan ID for payment initialization");
      throw new Error('חסר מזהה תכנית לאתחול התשלום');
    }

    if (!userId) {
      console.error("Missing user ID for payment initialization");
      throw new Error('חסר מזהה משתמש לאתחול התשלום');
    }

    if (!paymentUser.email) {
      console.error("Missing user email for payment initialization");
      throw new Error('חסרה כתובת דוא"ל לאתחול התשלום');
    }

    // Determine operation based on plan and operationType
    let operation = "ChargeOnly";
    if (operationType === 'token_only' || planId === 'monthly') {
      operation = "CreateTokenOnly";
    } else if (planId === 'annual') {
      operation = "ChargeAndCreateToken";
    }

    // Get amount based on plan
    let amount = 0;
    if (planId === 'monthly') {
      amount = 0; // Free trial, token only
    } else if (planId === 'annual') {
      amount = 3371;
    } else if (planId === 'vip') {
      amount = 13121;
    }

    // Get registration data for additional context
    let registrationData = null;
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        registrationData = JSON.parse(storedData);
      }
    } catch (error) {
      console.error("Error parsing registration data:", error);
      // Continue without registration data
    }

    // Call CardCom payment initialization Edge Function
    console.log("Calling cardcom-payment edge function with:", {
      planId,
      amount,
      operation,
      userId
    });

    const { data, error } = await supabase.functions.invoke('cardcom-payment', {
      body: {
        planId,
        amount,
        invoiceInfo: {
          fullName: paymentUser.fullName || paymentUser.email,
          email: paymentUser.email,
        },
        currency: "ILS",
        operation,
        redirectUrls: {
          success: `${window.location.origin}/subscription/success`,
          failed: `${window.location.origin}/subscription/failed`
        },
        userId,
        operationType,
        registrationData
      }
    });
    
    if (error) {
      console.error("Payment edge function error:", error);
      throw new Error(error.message || 'אירעה שגיאה באתחול התשלום');
    }
    
    if (!data?.success) {
      console.error("Payment initialization failed:", data?.message);
      throw new Error(data?.message || 'אירעה שגיאה באתחול התשלום');
    }
    
    console.log("Payment session created:", data.data);
    
    if (!data.data.lowProfileCode) {
      console.error("Missing lowProfileCode in response");
      throw new Error('חסר מזהה ייחודי לעסקה בתגובה מהשרת');
    }
    
    // Use the terminal number from the response or fallback to fixed value
    const terminalNumber = data.data.terminalNumber || '160138';
    
    setState(prev => ({
      ...prev,
      sessionId: data.data.sessionId,
      lowProfileCode: data.data.lowProfileCode,
      terminalNumber: terminalNumber,
      cardcomUrl: data.data.cardcomUrl || 'https://secure.cardcom.solutions',
      paymentStatus: PaymentStatus.IDLE,
      isFramesReady: false
    }));
    
    return { 
      lowProfileCode: data.data.lowProfileCode, 
      sessionId: data.data.sessionId,
      terminalNumber: terminalNumber
    };
  };

  return { initializePaymentSession };
};
