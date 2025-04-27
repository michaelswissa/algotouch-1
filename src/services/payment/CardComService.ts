
import { supabase } from '@/integrations/supabase/client';
import { PaymentLogger } from './PaymentLogger';

/**
 * Service for communicating with CardCom payment gateway
 */
export class CardComService {
  /**
   * Initialize a payment session
   */
  static async initializePayment({
    planId,
    userId,
    email,
    fullName,
    operationType = 'payment'
  }: {
    planId: string;
    userId: string | null;
    email: string;
    fullName: string;
    operationType?: 'payment' | 'token_only';
  }): Promise<{
    lowProfileCode: string;
    sessionId: string;
    terminalNumber: string;
    cardcomUrl: string;
    reference: string;
  }> {
    PaymentLogger.log('Initializing payment', { planId, email, operationType });

    // Determine amount based on plan
    const amount = 
      planId === 'monthly' ? 371 :
      planId === 'annual' ? 3371 : 13121;

    // Determine operation based on plan and operationType
    let operation = "ChargeOnly";
    if (operationType === 'token_only' || planId === 'monthly') {
      operation = "ChargeAndCreateToken";
    }

    try {
      const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
        body: {
          planId,
          amount,
          invoiceInfo: {
            fullName: fullName || email,
            email,
          },
          currency: "ILS",
          operation,
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          userId,
          operationType
        }
      });

      if (error) {
        throw new Error(error.message || 'שגיאה באתחול התשלום');
      }

      if (!data?.success) {
        throw new Error(data?.message || 'שגיאה באתחול התשלום');
      }

      PaymentLogger.log('Payment session created', data.data);

      if (!data.data || !data.data.lowProfileCode) {
        throw new Error('חסר מזהה יחודי לעסקה בתגובה מהשרת');
      }

      return {
        lowProfileCode: data.data.lowProfileCode,
        sessionId: data.data.sessionId || data.data.reference,
        terminalNumber: data.data.terminalNumber,
        cardcomUrl: data.data.cardcomUrl,
        reference: data.data.reference
      };
    } catch (error) {
      PaymentLogger.error('Payment initialization error:', error);
      throw error;
    }
  }
}
