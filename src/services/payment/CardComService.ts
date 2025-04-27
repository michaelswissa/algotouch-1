
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
  
  /**
   * Check the status of a payment transaction
   */
  static async checkPaymentStatus(lowProfileCode: string): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    if (!lowProfileCode) {
      PaymentLogger.error('Missing lowProfileCode for status check');
      return { success: false, error: 'Missing transaction ID' };
    }

    try {
      PaymentLogger.log('Checking payment status', { lowProfileCode });
      
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode }
      });

      if (error) {
        PaymentLogger.error('Error checking payment status', error);
        return { 
          success: false, 
          error: error.message || 'שגיאה בבדיקת סטטוס התשלום' 
        };
      }

      PaymentLogger.log('Payment status check result', data);
      
      if (!data?.success) {
        return { 
          success: false, 
          error: data?.message || 'העסקה לא אושרה' 
        };
      }

      return {
        success: true,
        transactionId: data.transactionId
      };
    } catch (error) {
      PaymentLogger.error('Exception during payment status check', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'שגיאה בבדיקת סטטוס התשלום' 
      };
    }
  }

  /**
   * Validate card owner information
   */
  static validateCardInfo(cardInfo: {
    cardOwnerName?: string;
    cardOwnerId?: string;
    cardOwnerEmail?: string;
    cardOwnerPhone?: string;
    expirationMonth?: string;
    expirationYear?: string;
  }): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};
    
    // Validate cardOwnerName
    if (!cardInfo.cardOwnerName?.trim()) {
      errors.cardOwnerName = 'נא להזין שם מלא';
    }
    
    // Validate email
    if (!cardInfo.cardOwnerEmail?.trim()) {
      errors.cardOwnerEmail = 'נא להזין כתובת אימייל';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardInfo.cardOwnerEmail)) {
      errors.cardOwnerEmail = 'כתובת אימייל לא תקינה';
    }
    
    // Validate phone
    if (cardInfo.cardOwnerPhone && !/^0[2-9]\d{7,8}$/.test(cardInfo.cardOwnerPhone)) {
      errors.cardOwnerPhone = 'מספר טלפון לא תקין';
    }
    
    // Validate expiration dates if provided
    if (cardInfo.expirationMonth && (isNaN(Number(cardInfo.expirationMonth)) || Number(cardInfo.expirationMonth) < 1 || Number(cardInfo.expirationMonth) > 12)) {
      errors.expirationMonth = 'חודש לא תקין';
    }
    
    if (cardInfo.expirationYear && isNaN(Number(cardInfo.expirationYear))) {
      errors.expirationYear = 'שנה לא תקינה';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
