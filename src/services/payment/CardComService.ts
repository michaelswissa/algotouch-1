
import { PaymentLogger } from './PaymentLogger';

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
  private static readonly SUBMIT_FUNCTION_URL = '/submit-payment';
  
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
      const response = await fetch('/functions/v1/cardcom-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terminalNumber: options.terminalNumber,
          apiName: 'bLaocQRMSnwphQRUVG3b', // This should ideally be in environment variables
          cardcomUrl: 'https://secure.cardcom.solutions',
          lowProfileCode: options.lowProfileCode,
          cardholderData: options.cardholderData,
          operationType: options.operationType || 'ChargeOnly',
          planId: options.planId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Payment submission failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      PaymentLogger.log('Payment submission response', result);
      
      if (result.success === false) {
        throw new Error(result.error || 'Payment submission failed');
      }
      
      return result;
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
      
      const response = await fetch('/functions/v1/cardcom-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lowProfileCode
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      PaymentLogger.log('Payment status response', result);
      
      if (result.success === false) {
        throw new Error(result.error || 'Status check failed');
      }
      
      return result;
    } catch (error) {
      PaymentLogger.error('Error checking payment status:', error);
      throw error;
    }
  }
}
