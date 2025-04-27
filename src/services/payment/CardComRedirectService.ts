
import { PaymentLogger } from './PaymentLogger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Service for handling CardCom redirect payments
 */
export class CardComRedirectService {
  /**
   * Initialize a redirect payment flow with CardCom
   */
  static async initializeRedirect({
    planId,
    amount,
    userEmail,
    fullName,
    userId
  }: {
    planId: string;
    amount: number;
    userEmail: string;
    fullName: string;
    userId?: string;
  }): Promise<{
    url: string;
    lowProfileCode: string;
    reference: string;
    sessionId?: string;
  }> {
    PaymentLogger.log('Initializing CardCom redirect payment', { planId, amount, userEmail });

    try {
      const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
        body: {
          planId,
          amount,
          invoiceInfo: {
            fullName,
            email: userEmail,
          },
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          userId: userId
        }
      });

      if (error) {
        throw new Error(error.message || 'שגיאה באתחול דף התשלום');
      }

      if (!data?.success || !data?.data?.url || !data?.data?.lowProfileCode) {
        throw new Error(data?.message || 'שגיאה באתחול דף התשלום');
      }

      PaymentLogger.log('CardCom redirect initialized', { 
        lowProfileCode: data.data.lowProfileCode,
        reference: data.data.reference
      });

      return {
        url: data.data.url,
        lowProfileCode: data.data.lowProfileCode,
        reference: data.data.reference,
        sessionId: data.data.sessionId
      };
    } catch (error) {
      PaymentLogger.error('CardCom redirect initialization error:', error);
      throw error;
    }
  }

  /**
   * Redirect the browser to the CardCom payment page
   */
  static redirectToPayment(url: string): void {
    if (!url) {
      throw new Error('חסרה כתובת מעבר לתשלום');
    }
    
    PaymentLogger.log('Redirecting to CardCom payment page', { url });
    window.location.href = url;
  }

  /**
   * Verify the status of a payment transaction
   */
  static async verifyPaymentStatus(lowProfileCode: string): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
    userId?: string;
  }> {
    if (!lowProfileCode) {
      return { success: false, error: 'חסר קוד זיהוי עסקה' };
    }
    
    PaymentLogger.log('Verifying payment status', { lowProfileCode });
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode }
      });

      if (error) {
        PaymentLogger.error('Error verifying payment status:', error);
        return { success: false, error: error.message || 'שגיאה בבדיקת סטטוס התשלום' };
      }

      if (!data?.success) {
        return { success: false, error: data?.message || 'העסקה לא אושרה' };
      }

      PaymentLogger.log('Payment verified successfully', {
        transactionId: data.transactionId,
        userId: data.userId
      });

      return {
        success: true,
        transactionId: data.transactionId,
        userId: data.userId
      };
    } catch (error) {
      PaymentLogger.error('Exception verifying payment status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'שגיאה בבדיקת סטטוס התשלום'
      };
    }
  }
}
