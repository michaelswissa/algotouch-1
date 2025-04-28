
import { supabase } from '@/integrations/supabase/client';
import { CardOwnerDetails, PaymentSessionData } from '@/components/payment/types/payment';
import { PaymentLogger } from './PaymentLogger';

export class CardComService {
  /**
   * Initialize a CardCom payment session for iframe-based payments
   */
  static async initializePayment(params: {
    planId: string;
    userId: string | null;
    email: string;
    fullName: string;
    operationType?: 'payment' | 'token_only';
  }): Promise<PaymentSessionData> {
    const { planId, userId, email, fullName, operationType = 'payment' } = params;

    try {
      PaymentLogger.log('Initializing payment', { planId, userId, email, operationType });

      // Call the unified CardCom payment Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          operation: operationType === 'token_only' || planId === 'monthly' 
            ? "ChargeAndCreateToken" 
            : "ChargeOnly",
          invoiceInfo: {
            fullName: fullName || email,
            email,
          },
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          userId,
          isIframePrefill: true,
          registrationData: sessionStorage.getItem('registration_data') 
            ? JSON.parse(sessionStorage.getItem('registration_data')!) 
            : null
        }
      });
      
      if (error || !data?.success) {
        PaymentLogger.error("Payment initialization error:", error || data?.message);
        throw new Error(error?.message || data?.message || 'שגיאה באתחול התשלום');
      }
      
      PaymentLogger.log("Payment session created:", data.data);
      
      if (!data.data || !data.data.lowProfileId) {
        PaymentLogger.error("Missing lowProfileId in payment session response");
        throw new Error('חסר מזהה יחודי לעסקה בתגובה מהשרת');
      }
      
      return { 
        lowProfileId: data.data.lowProfileId, 
        sessionId: data.data.sessionId,
        terminalNumber: data.data.terminalNumber,
        cardcomUrl: data.data.cardcomUrl || 'https://secure.cardcom.solutions',
        reference: data.data.reference || ''
      };
    } catch (error) {
      PaymentLogger.error("Exception during payment initialization:", error);
      throw error instanceof Error ? error : new Error('שגיאה באתחול התשלום');
    }
  }

  /**
   * Submit payment details to CardCom
   */
  static async submitPayment(params: {
    lowProfileCode: string;
    terminalNumber: string;
    operationType: 'payment' | 'token_only';
    cardOwnerDetails: CardOwnerDetails;
  }): Promise<boolean> {
    try {
      PaymentLogger.log('Submitting payment details', { 
        lowProfileCode: params.lowProfileCode,
        operationType: params.operationType 
      });
      
      const { data, error } = await supabase.functions.invoke('cardcom-submit', {
        body: {
          lowProfileCode: params.lowProfileCode,
          terminalNumber: params.terminalNumber,
          operation: params.operationType === 'token_only' ? 'ChargeAndCreateToken' : 'ChargeOnly',
          cardOwnerDetails: params.cardOwnerDetails
        }
      });

      if (error || !data?.success) {
        PaymentLogger.error('Payment submission error', error || data?.message);
        throw new Error(error?.message || data?.message || 'שגיאה בתהליך התשלום');
      }

      PaymentLogger.log('Payment details submitted successfully', data);
      return true;
    } catch (error) {
      PaymentLogger.error('Exception during payment submission', error);
      throw error;
    }
  }

  /**
   * Check the status of a payment transaction
   */
  static async checkPaymentStatus(lowProfileCode: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      transactionId?: string;
      transaction_id?: string;
      status?: string;
      amount?: number;
      [key: string]: any;
    };
  }> {
    try {
      if (!lowProfileCode) {
        PaymentLogger.error('Missing lowProfileCode for status check');
        return { success: false, message: 'חסר מזהה תשלום' };
      }

      PaymentLogger.log('Checking payment status', { lowProfileCode });
      
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode }
      });

      if (error) {
        PaymentLogger.error('Error checking payment status', error);
        return { success: false, message: error.message || 'שגיאה בבדיקת סטטוס התשלום' };
      }

      PaymentLogger.log('Payment status check result', data);
      return data || { success: false, message: 'תגובה לא ידועה מהשרת', data: null };
    } catch (error) {
      PaymentLogger.error('Exception during payment status check', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'שגיאה בבדיקת סטטוס התשלום' 
      };
    }
  }

  /**
   * Validate card owner information
   */
  static validateCardInfo(cardOwnerDetails: Partial<CardOwnerDetails>): { 
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};
    
    // Validate card owner name
    if (!cardOwnerDetails.cardOwnerName?.trim()) {
      errors.cardOwnerName = 'שם בעל הכרטיס הוא שדה חובה';
    } else if (cardOwnerDetails.cardOwnerName?.trim().length < 2) {
      errors.cardOwnerName = 'שם בעל הכרטיס קצר מדי';
    }
    
    // Validate ID number
    if (!cardOwnerDetails.cardOwnerId?.trim()) {
      errors.cardOwnerId = 'מספר תעודת זהות הוא שדה חובה';
    } else if (!/^\d{9}$/.test(cardOwnerDetails.cardOwnerId)) {
      errors.cardOwnerId = 'מספר תעודת זהות צריך להכיל 9 ספרות בדיוק';
    }
    
    // Validate email
    if (!cardOwnerDetails.cardOwnerEmail?.trim()) {
      errors.cardOwnerEmail = 'דוא"ל הוא שדה חובה';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cardOwnerDetails.cardOwnerEmail)) {
      errors.cardOwnerEmail = 'כתובת דוא"ל לא תקינה';
    }
    
    // Validate phone
    if (!cardOwnerDetails.cardOwnerPhone?.trim()) {
      errors.cardOwnerPhone = 'מספר טלפון הוא שדה חובה';
    } else if (!/^0\d{8,9}$/.test(cardOwnerDetails.cardOwnerPhone.replace(/[- ]/g, ''))) {
      errors.cardOwnerPhone = 'מספר טלפון לא תקין';
    }
    
    // Validate card expiration month and year
    if (cardOwnerDetails.expirationMonth) {
      if (!/^(0[1-9]|1[0-2])$/.test(cardOwnerDetails.expirationMonth)) {
        errors.expirationMonth = 'חודש לא תקין';
      }
    }
    
    if (cardOwnerDetails.expirationYear) {
      const currentYear = new Date().getFullYear() % 100;  // Get last 2 digits of year
      const yearNum = parseInt(cardOwnerDetails.expirationYear);
      
      if (isNaN(yearNum) || yearNum < currentYear || yearNum > currentYear + 20) {
        errors.expirationYear = 'שנה לא תקינה';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(subscriptionId: string): Promise<{ 
    success: boolean;
    message: string;
  }> {
    try {
      PaymentLogger.log('Cancelling subscription', { subscriptionId });
      
      const { data, error } = await supabase.functions.invoke('cardcom-recurring', {
        body: { 
          action: 'cancel', 
          subscriptionId 
        }
      });
      
      if (error) {
        PaymentLogger.error('Error cancelling subscription', error);
        return { 
          success: false, 
          message: error.message || 'שגיאה בביטול המנוי' 
        };
      }
      
      if (!data?.success) {
        return { 
          success: false, 
          message: data?.message || 'שגיאה בביטול המנוי' 
        };
      }
      
      PaymentLogger.log('Subscription cancelled successfully', { subscriptionId });
      return { 
        success: true, 
        message: data.message || 'המנוי בוטל בהצלחה' 
      };
    } catch (error) {
      PaymentLogger.error('Exception during subscription cancellation', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'שגיאה בביטול המנוי' 
      };
    }
  }
}
