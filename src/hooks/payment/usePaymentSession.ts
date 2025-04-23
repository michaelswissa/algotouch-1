
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { CARDCOM } from '@/config/cardcom';

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

    if (!paymentUser.email) {
      throw new Error('חסרה כתובת דוא"ל לביצוע התשלום');
    }

    // Determine amount and operation based on plan type
    let amount = 0;
    let operation: "ChargeOnly" | "CreateTokenOnly" | "ChargeAndCreateToken" = "ChargeOnly";
    
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

    const planNames = {
      'monthly': 'מנוי חודשי',
      'annual': 'מנוי שנתי',
      'vip': 'מנוי VIP'
    };

    // Generate a unique reference value
    const returnValue = `${planId}-${userId || 'guest'}-${Date.now()}`;

    // Prepare the payload for CardCom API
    const payload = {
      TerminalNumber: CARDCOM.TERMINAL_NUMBER,
      ApiName: CARDCOM.API_NAME,
      Operation: operation,
      ReturnValue: returnValue,
      Amount: amount.toString(), // Convert amount to string
      WebHookUrl: CARDCOM.WEBHOOK_URL,
      SuccessRedirectUrl: CARDCOM.SUCCESS_URL,
      FailedRedirectUrl: CARDCOM.FAILED_URL,
      ProductName: planNames[planId as keyof typeof planNames] || 'מנוי',
      Language: "he",
      ISOCoinId: 1, // ILS
      Document: {
        Name: paymentUser.fullName || paymentUser.email,
        Email: paymentUser.email,
        Products: [{
          Description: planNames[planId as keyof typeof planNames] || 'מנוי',
          UnitCost: amount.toString(), // Convert UnitCost to string
          Quantity: 1
        }]
      }
    };

    try {
      console.log("Calling CardCom payment API with payload:", {
        ...payload,
        Document: { ...payload.Document, Products: '[Products array]' }
      });

      // Call CardCom payment initialization Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: amount.toString(), // Convert amount to string
          invoiceInfo: {
            fullName: paymentUser.fullName || paymentUser.email,
            email: paymentUser.email,
          },
          currency: "ILS",
          operation: operation,
          redirectUrls: {
            success: CARDCOM.SUCCESS_URL,
            failed: CARDCOM.FAILED_URL
          },
          userId: userId,
          operationType,
          registrationData: sessionStorage.getItem('registration_data') 
            ? JSON.parse(sessionStorage.getItem('registration_data')!) 
            : null,
          payload
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
        terminalNumber: CARDCOM.TERMINAL_NUMBER,
        cardcomUrl: "https://secure.cardcom.solutions",
        paymentStatus: PaymentStatus.IDLE
      }));
      
      return { 
        lowProfileCode: data.data.lowProfileCode, 
        sessionId: data.data.sessionId,
        terminalNumber: CARDCOM.TERMINAL_NUMBER
      };
    } catch (error) {
      console.error('Error during payment initialization:', error);
      
      // Handle specific errors
      if (error instanceof Error && error.message.includes('Missing required parameters')) {
        throw new Error('חסרים פרטים נדרשים לביצוע התשלום');
      }
      
      throw error;
    }
  };

  return { initializePaymentSession };
};
