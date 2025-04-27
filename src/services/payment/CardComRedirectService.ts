
import { PaymentSessionData } from '@/components/payment/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { PaymentLogger } from './PaymentLogger';

interface RedirectPaymentParams {
  planId: string;
  amount: number;
  userEmail: string;
  fullName: string;
  userId?: string | null;
}

/**
 * Service responsible for handling CardCom redirect payment flows
 */
export class CardComRedirectService {
  /**
   * Initialize a redirect-based payment flow with CardCom
   */
  static async initializeRedirect({
    planId,
    amount,
    userEmail,
    fullName,
    userId
  }: RedirectPaymentParams): Promise<{ url: string; lowProfileCode: string; reference: string }> {
    try {
      PaymentLogger.log('Initializing CardCom redirect payment', {
        planId,
        amount,
        userEmail,
        hasUserId: !!userId
      });
      
      const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
        body: {
          planId,
          amount,
          userId,
          invoiceInfo: {
            fullName,
            email: userEmail,
          },
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          }
        }
      });

      if (error) {
        PaymentLogger.error('CardCom redirect initialization error:', error);
        throw new Error(error.message || 'שגיאה באתחול דף התשלום');
      }
      
      if (!data?.success) {
        PaymentLogger.error('CardCom redirect initialization failed:', data?.message);
        throw new Error(data?.message || 'שגיאה באתחול דף התשלום');
      }

      if (!data.data?.url) {
        throw new Error('חסרה כתובת מעבר לתשלום');
      }
      
      PaymentLogger.log('CardCom redirect initialized successfully', {
        lowProfileCode: data.data.lowProfileCode,
        reference: data.data.reference
      });

      return {
        url: data.data.url,
        lowProfileCode: data.data.lowProfileCode,
        reference: data.data.reference
      };
    } catch (error) {
      PaymentLogger.error('Exception during redirect initialization:', error);
      throw new Error(error instanceof Error ? error.message : 'שגיאה באתחול דף התשלום');
    }
  }
  
  /**
   * Redirect to CardCom payment page
   */
  static redirectToPayment(url: string): void {
    if (!url) {
      throw new Error('חסרה כתובת מעבר לתשלום');
    }
    
    PaymentLogger.log('Redirecting to CardCom payment page', { url });
    window.location.href = url;
  }
  
  /**
   * Verify payment status after return from CardCom
   */
  static async verifyPaymentStatus(lowProfileCode: string): Promise<boolean> {
    if (!lowProfileCode) {
      PaymentLogger.error('Missing lowProfileCode for status check');
      return false;
    }
    
    try {
      PaymentLogger.log('Checking payment status', { lowProfileCode });
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode }
      });

      if (error) {
        PaymentLogger.error('Error checking payment status:', error);
        throw new Error(error.message || 'שגיאה בבדיקת סטטוס התשלום');
      }

      PaymentLogger.log('Payment status check result', { success: data?.success });
      return data?.success || false;
    } catch (error) {
      PaymentLogger.error('Exception during payment status check:', error);
      return false;
    }
  }
}
