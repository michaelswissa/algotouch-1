
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
   * Initialize a payment session with CardCom
   */
  static async initializePayment(options: {
    terminalNumber: string;
    apiName: string;
    amount: number;
    currency?: string;
    successUrl: string;
    failureUrl: string;
    operationType?: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly';
    language?: string;
    planId?: string;
    returnValue?: string;
  }): Promise<any> {
    try {
      PaymentLogger.log('Initializing CardCom payment', options);
      
      // Call the edge function for initializing the payment
      const response = await fetch('/functions/v1/cardcom-redirect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      if (!response.ok) {
        throw new Error(`Payment initialization failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      PaymentLogger.log('Payment initialization response', result);
      
      if (result.success === false) {
        throw new Error(result.error || 'Payment initialization failed');
      }
      
      return result;
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
