
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
      userId,
      email: paymentUser.email,
      fullName: paymentUser.fullName,
      operationType
    });

    if (!paymentUser.email) {
      throw new Error('חסרה כתובת דוא"ל לביצוע התשלום');
    }

    let amount = 0;
    let operation: "ChargeOnly" | "CreateTokenOnly" | "ChargeAndCreateToken" = "ChargeOnly";
    
    // Determine amount and operation based on plan
    if (planId === 'monthly') {
      amount = 0;
      operation = "CreateTokenOnly"; // Free trial token
    } else if (planId === 'annual') {
      amount = 3371;
      operation = "ChargeAndCreateToken"; // Charge and create token for renewal
    } else if (planId === 'vip') {
      amount = 13121;
      operation = "ChargeOnly"; // One-time charge
    }

    const planNames = {
      'monthly': 'מנוי חודשי – ניסיון חינם',
      'annual': 'מנוי שנתי',
      'vip': 'מנוי VIP'
    };

    const returnValue = `${planId}-${userId || 'guest'}-${Date.now()}`;

    // Prepare CardCom payload
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
      // Log the payload for debugging (excluding sensitive data)
      console.log("Calling CardCom API with payload:", {
        planId,
        amount,
        operation,
        email: paymentUser.email,
        fullName: paymentUser.fullName
      });

      // Call the cardcom-payment edge function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: amount.toString(),
          invoiceInfo: {
            fullName: paymentUser.fullName || paymentUser.email,
            email: paymentUser.email,
          },
          currency: "ILS",
          operationType,
          operation, // Pass the determined operation type
          redirectUrls: {
            success: CARDCOM.SUCCESS_URL,
            failed: CARDCOM.FAILED_URL
          },
          userId,
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
      
      console.log("Payment session created successfully:", data.data);
      
      // Store payment session data in state
      setState(prev => ({
        ...prev,
        isReady: true, // Add isReady flag to signal UI components
        sessionId: data.data.sessionId,
        lowProfileCode: data.data.lowProfileCode,
        terminalNumber: data.data.terminalNumber || CARDCOM.TERMINAL_NUMBER,
        cardcomUrl: data.data.cardcomUrl || "https://secure.cardcom.solutions",
        paymentStatus: PaymentStatus.IDLE
      }));
      
      return { 
        lowProfileCode: data.data.lowProfileCode, 
        sessionId: data.data.sessionId,
        terminalNumber: data.data.terminalNumber || CARDCOM.TERMINAL_NUMBER
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
