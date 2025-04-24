
import { CreateLowProfilePayload } from './types';
import { CARDCOM } from '@/config/cardcom';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentSessionProps {
  setState: (updater: any) => void;
}

export const usePaymentSession = ({ setState }: UsePaymentSessionProps) => {
  const initializePaymentSession = async (
    planId: string,
    userId: string | null,
    paymentUser: { email: string; fullName: string },
    operationType: 'payment' | 'token_only' = 'payment'
  ): Promise<{ lowProfileCode: string; sessionId: string; terminalNumber: number }> => {
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
      'monthly': 'מנוי חודשי – ניסיון חינם',
      'annual': 'מנוי שנתי',
      'vip': 'מנוי VIP'
    };

    const returnValue = `${planId}-${userId || 'guest'}-${Date.now()}`;

    const payload: CreateLowProfilePayload = {
      TerminalNumber: CARDCOM.TERMINAL_NUMBER,
      ApiName: CARDCOM.API_NAME,
      Operation: operation,
      ReturnValue: returnValue,
      Amount: amount.toString(), // Convert to string as CardCom requires
      SuccessRedirectUrl: CARDCOM.SUCCESS_URL,
      FailedRedirectUrl: CARDCOM.FAILED_URL,
      WebHookUrl: CARDCOM.WEBHOOK_URL,
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
      console.log("Calling CardCom API with payload:", {
        ...payload,
        Document: { ...payload.Document, Products: '[Products array]' }
      });

      // Use cardcom-payment function, make sure it exists in Supabase
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
      
      // Enhanced error handling with specific error messages
      if (error) {
        console.error("Edge function error:", error);
        throw new Error(`שגיאת שרת: ${error.message || 'אירעה שגיאה בעת יצירת סשן תשלום'}`);
      }
      
      if (!data || data?.success !== true) {
        console.error("Non-successful response from edge function:", data);
        throw new Error(data?.message || 'פונקציית הקצה החזירה קוד שגיאה');
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
      
      if (error instanceof Error) {
        if (error.message.includes('Missing required parameters')) {
          throw new Error('חסרים פרטים נדרשים לביצוע התשלום');
        }
        // Show error message to user
        toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      }
      
      throw error;
    }
  };

  return { initializePaymentSession };
};
