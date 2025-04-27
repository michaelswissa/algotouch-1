
import { PaymentLogger } from './PaymentLogger';
import { supabase } from '@/integrations/supabase/client';

export interface CardComPaymentOptions {
  lowProfileCode: string;
  terminalNumber: string;
  cardholderData?: {
    name?: string;
    email?: string;
    phone?: string;
    id?: string;
  };
  operationType?: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly';
  planId?: string;
}

export class CardComService {
  private static readonly CARDCOM_API_BASE = 'https://secure.cardcom.solutions/api';
  
  /**
   * Initialize a payment session with CardCom
   */
  static async initializePayment(options: {
    planId: string;
    amount: number;
    userEmail: string;
    fullName: string;
    userId?: string | null;
    operationType?: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly';
  }): Promise<any> {
    try {
      PaymentLogger.log('Initializing CardCom payment', options);
      
      // Call the edge function for initializing the payment
      const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
        body: {
          planId: options.planId,
          amount: options.amount,
          userId: options.userId,
          invoiceInfo: {
            fullName: options.fullName,
            email: options.userEmail,
          },
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          operation: options.operationType || (options.planId === 'monthly' ? 'ChargeAndCreateToken' : 'ChargeOnly')
        }
      });
      
      if (error) {
        throw new Error(`Payment initialization failed: ${error.message}`);
      }
      
      PaymentLogger.log('Payment initialization response', data);
      
      if (!data?.success) {
        throw new Error(data?.message || 'Payment initialization failed');
      }
      
      return data.data;
    } catch (error) {
      PaymentLogger.error('Error initializing payment with CardCom:', error);
      throw error;
    }
  }
  
  /**
   * Submit a payment to CardCom
   */
  static async submitPayment(options: CardComPaymentOptions): Promise<any> {
    try {
      PaymentLogger.log('Submitting payment to CardCom', {
        lowProfileCode: options.lowProfileCode,
        operationType: options.operationType || 'ChargeOnly'
      });
      
      // Call the edge function for submitting the payment
      const { data, error } = await supabase.functions.invoke('cardcom-submit', {
        body: {
          terminalNumber: options.terminalNumber,
          lowProfileCode: options.lowProfileCode,
          cardholderData: options.cardholderData,
          operationType: options.operationType || 'ChargeOnly',
          planId: options.planId
        }
      });
      
      if (error) {
        throw new Error(`Payment submission failed: ${error.message}`);
      }
      
      PaymentLogger.log('Payment submission response', data);
      
      if (!data?.success) {
        throw new Error(data?.error || 'Payment submission failed');
      }
      
      return data;
    } catch (error) {
      PaymentLogger.error('Error submitting payment to CardCom:', error);
      throw error;
    }
  }
  
  /**
   * Check payment status
   */
  static async checkPaymentStatus(lowProfileCode: string): Promise<any> {
    try {
      PaymentLogger.log('Checking payment status', { lowProfileCode });
      
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode
        }
      });
      
      if (error) {
        throw new Error(`Status check failed: ${error.message}`);
      }
      
      PaymentLogger.log('Payment status response', data);
      
      return data;
    } catch (error) {
      PaymentLogger.error('Error checking payment status:', error);
      throw error;
    }
  }

  /**
   * Validate card information
   */
  static validateCardInfo(cardInfo: {
    cardNumber?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cvv?: string;
    holderName?: string;
  }): { valid: boolean; error?: string } {
    // Implement card validation logic here
    if (!cardInfo.cardNumber) {
      return { valid: false, error: 'מספר כרטיס חסר' };
    }
    
    if (!cardInfo.expiryMonth || !cardInfo.expiryYear) {
      return { valid: false, error: 'תוקף כרטיס חסר' };
    }

    return { valid: true };
  }
}
