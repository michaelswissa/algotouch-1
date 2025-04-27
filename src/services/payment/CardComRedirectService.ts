
import { supabase } from '@/integrations/supabase/client';
import { PaymentLogger } from './PaymentLogger';
import { toast } from 'sonner';

export class CardComRedirectService {
  /**
   * Initialize a redirect-based payment flow with CardCom
   */
  static async initializeRedirect(params: {
    planId: string;
    amount: number;
    userEmail: string;
    fullName: string;
    userId?: string;
  }): Promise<{ url: string; lowProfileCode: string; reference: string }> {
    try {
      PaymentLogger.log('Initializing redirect payment', { 
        planId: params.planId, 
        amount: params.amount,
        email: params.userEmail
      });

      const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
        body: {
          planId: params.planId,
          amount: params.amount,
          invoiceInfo: {
            fullName: params.fullName,
            email: params.userEmail,
          },
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          userId: params.userId
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
   * Redirect the user to CardCom payment page
   */
  static redirectToPayment(url: string): void {
    if (!url) {
      throw new Error('חסרה כתובת מעבר לתשלום');
    }
    
    window.location.href = url;
  }

  /**
   * Verify the status of a payment after redirect
   */
  static async verifyPaymentStatus(lowProfileCode: string): Promise<{
    success: boolean;
    error?: string;
    transactionId?: string;
    status?: string;
    paymentData?: any; // Add complete payment data
  }> {
    try {
      PaymentLogger.log('Verifying payment status after redirect', { lowProfileCode });
      
      if (!lowProfileCode) {
        PaymentLogger.error('Missing lowProfileCode for status verification');
        return { 
          success: false, 
          error: 'חסר מזהה עסקה' 
        };
      }

      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode }
      });

      if (error) {
        PaymentLogger.error('Error checking redirect payment status:', error);
        return { 
          success: false, 
          error: error.message || 'שגיאה בבדיקת סטטוס התשלום' 
        };
      }

      if (!data?.success) {
        PaymentLogger.error('Payment verification failed:', data?.message);
        return { 
          success: false, 
          error: data?.message || 'התשלום נכשל או בוטל' 
        };
      }

      PaymentLogger.log('Payment successfully verified', { 
        transactionId: data.transactionId,
        status: data.status,
        fullResponse: data
      });

      return { 
        success: true,
        transactionId: data.transactionId,
        status: data.status,
        paymentData: data // Return the full payment data
      };
    } catch (error) {
      PaymentLogger.error('Exception during payment verification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'שגיאה בתהליך אימות התשלום' 
      };
    }
  }
}
