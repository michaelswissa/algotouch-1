
import { useState, useCallback } from 'react';
import { PaymentSessionData } from '@/components/payment/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { supabase } from '@/integrations/supabase/client';

interface UsePaymentSessionProps {
  setState: React.Dispatch<React.SetStateAction<any>>;
}

export const usePaymentSession = ({ setState }: UsePaymentSessionProps) => {
  const [isInitializing, setIsInitializing] = useState(false);
  
  const initializePaymentSession = useCallback(async (
    planId: string,
    userId: string | null,
    userDetails: { email: string; fullName: string },
    operationType: 'payment' | 'token_only'
  ): Promise<PaymentSessionData> => {
    try {
      setIsInitializing(true);
      PaymentLogger.log('Initializing payment session', { planId, operationType });
      
      // Calculate amount based on plan
      let amount = 0;
      switch (planId) {
        case 'monthly':
          amount = 371;
          break;
        case 'annual':
          amount = 3371;
          break;
        case 'vip':
          amount = 13121;
          break;
        default:
          throw new Error(`Unsupported plan: ${planId}`);
      }

      // Determine operation type based on plan
      const operation = operationType === 'token_only' ? 'ChargeAndCreateToken' : 'ChargeOnly';
      
      // Call the real cardcom-redirect edge function
      const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
        body: {
          planId,
          amount,
          userId,
          invoiceInfo: {
            fullName: userDetails.fullName,
            email: userDetails.email,
          },
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          }
        }
      });
      
      if (error) {
        console.error('CardCom payment initialization error:', error);
        throw new Error(error.message || 'שגיאה באתחול תהליך התשלום');
      }
      
      if (!data?.success) {
        console.error('CardCom payment initialization failed:', data?.message);
        throw new Error(data?.message || 'שגיאה באתחול תהליך התשלום');
      }
      
      PaymentLogger.log('Payment session initialized successfully', data.data);
      
      return data.data;
    } catch (error) {
      PaymentLogger.error('Error initializing payment session:', error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [setState]);
  
  return { initializePaymentSession, isInitializing };
};
