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
      
      // Get plan details from database
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('price, code, cycle_days')
        .eq('id', planId)
        .single();
      
      if (planError || !plan) {
        PaymentLogger.error("Error fetching plan details:", planError);
        throw new Error(`שגיאה בטעינת פרטי התוכנית: ${planError?.message || 'Plan not found'}`);
      }

      // Determine operation based on plan and operationType
      const operation = operationType === 'token_only' || planId === 'monthly' 
        ? "ChargeAndCreateToken" 
        : "ChargeOnly";

      // Call CardCom payment initialization Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
        body: {
          planId,
          amount: plan.price,
          operation,
          invoiceInfo: {
            fullName: fullName || email,
            email,
          },
          currency: "ILS",
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          userId,
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
   * Submit payment information to CardCom
   */
  static async submitPayment(params: {
    lowProfileCode: string;
    terminalNumber: string;
    operationType?: 'payment' | 'token_only';
    cardOwnerDetails: CardOwnerDetails;
  }): Promise<{ success: boolean; transactionId?: string }> {
    const { 
      lowProfileCode, 
      terminalNumber, 
      operationType = 'payment',
      cardOwnerDetails
    } = params;
    
    try {
      PaymentLogger.log('Submitting payment', { 
        lowProfileCode,
        operationType 
      });
      
      // Validate critical fields
      if (!cardOwnerDetails.cardOwnerName?.trim()) {
        throw new Error('שם בעל הכרטיס חסר');
      }
      
      if (!cardOwnerDetails.cardOwnerId?.trim() || !(/^\d{9}$/.test(cardOwnerDetails.cardOwnerId))) {
        throw new Error('תעודת זהות לא תקינה - יש להזין 9 ספרות');
      }
      
      if (!cardOwnerDetails.cardOwnerEmail?.trim() || 
          !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardOwnerDetails.cardOwnerEmail))) {
        throw new Error('כתובת אימייל לא תקינה');
      }
      
      if (!cardOwnerDetails.cardOwnerPhone?.trim() || !(/^0\d{8,9}$/.test(cardOwnerDetails.cardOwnerPhone))) {
        throw new Error('מספר טלפון לא תקין');
      }
      
      const { data, error } = await supabase.functions.invoke('cardcom-submit', {
        body: {
          lowProfileCode,
          terminalNumber,
          operation: operationType === 'token_only' ? "ChargeAndCreateToken" : "ChargeOnly",
          cardOwnerDetails
        }
      });

      if (error || !data?.success) {
        PaymentLogger.error('Payment submission error', error || data?.message);
        throw new Error(error?.message || data?.message || 'שגיאה בעיבוד התשלום');
      }

      PaymentLogger.log('Payment submitted successfully', data);
      return { 
        success: true, 
        transactionId: data.transactionId 
      };
    } catch (error) {
      PaymentLogger.error('Exception during payment submission', error);
      throw error instanceof Error ? error : new Error('שגיאה בעיבוד התשלום');
    }
  }

  /**
   * Check the status of a payment transaction
   */
  static async checkPaymentStatus(lowProfileCode: string): Promise<{
    success: boolean;
    status?: string;
    transactionId?: string;
  }> {
    try {
      if (!lowProfileCode) {
        PaymentLogger.error('Missing lowProfileCode for status check');
        return { success: false };
      }

      PaymentLogger.log('Checking payment status', { lowProfileCode });
      
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode }
      });

      if (error) {
        PaymentLogger.error('Error checking payment status', error);
        return { success: false };
      }

      PaymentLogger.log('Payment status check result', data);
      return { 
        success: data?.success || false,
        status: data?.status,
        transactionId: data?.transactionId
      };
    } catch (error) {
      PaymentLogger.error('Exception during payment status check', error);
      return { success: false };
    }
  }

  /**
   * Validate card information using client-side checks
   */
  static validateCardInfo(cardInfo: {
    cardOwnerName?: string;
    cardOwnerId?: string;
    cardOwnerEmail?: string;
    cardOwnerPhone?: string;
    expirationMonth?: string;
    expirationYear?: string;
  }): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    // Validate cardholder name
    if (!cardInfo.cardOwnerName?.trim()) {
      errors.cardOwnerName = 'שם בעל הכרטיס הוא שדה חובה';
    } else if (cardInfo.cardOwnerName.length < 2) {
      errors.cardOwnerName = 'שם בעל הכרטיס חייב להכיל לפחות 2 תווים';
    }
    
    // Validate ID
    if (!cardInfo.cardOwnerId?.trim()) {
      errors.cardOwnerId = 'תעודת זהות היא שדה חובה';
    } else if (!/^\d{9}$/.test(cardInfo.cardOwnerId)) {
      errors.cardOwnerId = 'תעודת זהות חייבת להכיל 9 ספרות בדיוק';
    }
    
    // Validate email
    if (!cardInfo.cardOwnerEmail?.trim()) {
      errors.cardOwnerEmail = 'דואר אלקטרוני הוא שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardInfo.cardOwnerEmail)) {
      errors.cardOwnerEmail = 'יש להזין כתובת דואר אלקטרוני תקינה';
    }
    
    // Validate phone
    if (!cardInfo.cardOwnerPhone?.trim()) {
      errors.cardOwnerPhone = 'מספר טל��ון הוא שדה חובה';
    } else if (!/^0\d{8,9}$/.test(cardInfo.cardOwnerPhone)) {
      errors.cardOwnerPhone = 'יש להזין מספר טלפון ישראלי תקין';
    }
    
    // Validate expiry date
    if (!cardInfo.expirationMonth) {
      errors.expirationMonth = 'חודש תפוגה הוא שדה חובה';
    }
    
    if (!cardInfo.expirationYear) {
      errors.expirationYear = 'שנת תפוגה היא שדה חובה';
    }
    
    if (cardInfo.expirationMonth && cardInfo.expirationYear) {
      // Check if card is expired
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100; // Last two digits
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      const expiryMonth = parseInt(cardInfo.expirationMonth);
      const expiryYear = parseInt(cardInfo.expirationYear);
      
      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        errors.expirationYear = 'כרטיס האשראי פג תוקף';
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}
