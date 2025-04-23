import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { CARDCOM } from '@/config/cardcom';

interface UsePaymentSessionProps {
  setState: (updater: any) => void;
}

interface CreateLowProfilePayload {
  TerminalNumber: number;
  ApiName: string;
  Operation: "ChargeOnly" | "CreateTokenOnly" | "ChargeAndCreateToken";
  ReturnValue: string;
  Amount: string; // Must be string for CardCom API
  SuccessRedirectUrl: string;
  FailedRedirectUrl: string;
  WebHookUrl: string;
  ProductName?: string;
  Language?: string;
  ISOCoinId?: number;
  Document: {
    Name: string;
    Email: string;
    Products: Array<{
      Description: string;
      UnitCost: string; // Must be string for CardCom API
      Quantity?: number;
    }>;
  };
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

    let amount = 0;
    let operation: "ChargeOnly" | "CreateTokenOnly" | "ChargeAndCreateToken" = "ChargeOnly";
    
    if (planId === 'monthly') {
      amount = 0;
      operation = "CreateTokenOnly";
    } else if (planId === 'annual') {
      amount = 3371;
      operation = "ChargeAndCreateToken";
    } else if (planId === 'vip') {
      amount = 13121;
      operation = "ChargeOnly";
    }

    const planNames = {
      'monthly': 'מנוי חודשי',
      'annual': 'מנוי שנתי',
      'vip': 'מנוי VIP'
    };

    const returnValue = `${planId}-${userId || 'guest'}-${Date.now()}`;

    const payload: CreateLowProfilePayload = {
      TerminalNumber: CARDCOM.TERMINAL_NUMBER,
      ApiName: CARDCOM.API_NAME,
      Operation: operation,
      ReturnValue: returnValue,
      Amount: amount.toString(),
      WebHookUrl: CARDCOM.WEBHOOK_URL,
      SuccessRedirectUrl: CARDCOM.SUCCESS_URL,
      FailedRedirectUrl: CARDCOM.FAILED_URL,
      ProductName: planNames[planId as keyof typeof planNames] || 'מנוי',
      Language: "he",
      ISOCoinId: 1,
      Document: {
        Name: paymentUser.fullName || paymentUser.email,
        Email: paymentUser.email,
        Products: [{
          Description: planNames[planId as keyof typeof planNames] || 'מנוי',
          UnitCost: amount.toString(),
          Quantity: 1
        }]
      }
    };

    try {
      console.log("Calling CardCom payment API with payload:", {
        ...payload,
        Document: { ...payload.Document, Products: '[Products array]' }
      });

      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: amount.toString(),
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
      
      if (error instanceof Error && error.message.includes('Missing required parameters')) {
        throw new Error('חסרים פרטים נדרשים לביצוע התשלום');
      }
      
      throw error;
    }
  };

  return { initializePaymentSession };
};
