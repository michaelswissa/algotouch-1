
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UsePaymentSessionProps {
  setState: (updater: any) => void;
}

// CardCom configuration
const CARDCOM_CONFIG = {
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  domain: "https://algotouch.lovable.app",
  successUrl: "https://algotouch.lovable.app/payment/success",
  failedUrl: "https://algotouch.lovable.app/payment/failed",
  webhookUrl: "https://algotouch.lovable.app/api/cardcom-webhook",
  cardcomUrl: "https://secure.cardcom.solutions",
};

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

    const planNames = {
      'monthly': 'מנוי חודשי',
      'annual': 'מנוי שנתי',
      'vip': 'מנוי VIP'
    };

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
          success: CARDCOM_CONFIG.successUrl,
          failed: CARDCOM_CONFIG.failedUrl
        },
        userId: userId,
        operationType,
        registrationData: sessionStorage.getItem('registration_data') 
          ? JSON.parse(sessionStorage.getItem('registration_data')!) 
          : null,
        payload: {
          TerminalNumber: CARDCOM_CONFIG.terminalNumber,
          ApiName: CARDCOM_CONFIG.apiName,
          Operation: operation, 
          ReturnValue: `${planId}-${Date.now()}`,
          Amount: amount,
          WebHookUrl: CARDCOM_CONFIG.webhookUrl,
          SuccessRedirectUrl: CARDCOM_CONFIG.successUrl,
          FailedRedirectUrl: CARDCOM_CONFIG.failedUrl,
          ProductName: planNames[planId as keyof typeof planNames] || 'מנוי',
          Language: "he",
          ISOCoinId: 1, // ILS
          Document: {
            Name: paymentUser.fullName || paymentUser.email,
            Email: paymentUser.email,
            Products: [{
              Description: planNames[planId as keyof typeof planNames] || 'מנוי',
              UnitCost: amount,
              Quantity: 1
            }]
          }
        }
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
      terminalNumber: CARDCOM_CONFIG.terminalNumber,
      cardcomUrl: CARDCOM_CONFIG.cardcomUrl,
      paymentStatus: PaymentStatus.IDLE
    }));
    
    return { 
      lowProfileCode: data.data.lowProfileCode, 
      sessionId: data.data.sessionId,
      terminalNumber: CARDCOM_CONFIG.terminalNumber
    };
  };

  return { initializePaymentSession };
};
