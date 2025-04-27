
import { supabase } from '@/integrations/supabase/client';
import { PaymentLogger } from './PaymentLogger';
import {
  DirectTransactionRequest,
  TransactionResponse,
  CardDetails,
  CardOwnerInformation,
  CustomField,
  DocumentInfo
} from '@/types/cardcom-transaction';

/**
 * Service for direct CardCom transaction operations
 * Handles server-side payment processing without using iframes
 */
export class CardComDirectService {
  /**
   * Process a direct payment transaction
   */
  static async processTransaction(params: DirectTransactionRequest): Promise<TransactionResponse> {
    try {
      PaymentLogger.log('Processing direct payment transaction', { 
        amount: params.amount, 
        isRefund: params.isRefund,
        hasToken: !!params.cardToken,
        hasCardDetails: !!params.cardDetails 
      });
      
      if (!params.amount || (params.amount <= 0)) {
        throw new Error('תשלום חייב להיות בסכום חיובי');
      }
      
      if (!params.cardToken && !params.cardDetails) {
        throw new Error('חסרים פרטי כרטיס אשראי');
      }
      
      const { data, error } = await supabase.functions.invoke('cardcom-transaction', {
        body: {
          ...params,
          // Format card details if provided
          cardNumber: params.cardDetails?.cardNumber,
          cardExpirationMMYY: params.cardDetails?.expirationMMYY,
          cvv: params.cardDetails?.cvv,
          // Generate unique transaction reference if not provided
          externalUniqTranId: params.externalUniqTranId || `txn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        }
      });
      
      if (error) {
        PaymentLogger.error('Error in direct payment processing', error);
        throw new Error(error.message || 'שגיאה בעיבוד התשלום');
      }
      
      if (!data?.success) {
        PaymentLogger.error('Payment processing failed', data?.message);
        throw new Error(data?.message || 'עיבוד התשלום נכשל');
      }
      
      PaymentLogger.log('Transaction processed successfully', { 
        transactionId: data.data?.transactionId,
        responseCode: data.data?.responseCode
      });
      
      return data.data;
    } catch (error) {
      PaymentLogger.error('Exception during direct payment processing', error);
      throw error instanceof Error 
        ? error 
        : new Error('שגיאה בעיבוד התשלום');
    }
  }
  
  /**
   * Charge payment using a card token
   */
  static async chargeWithToken(params: {
    userId?: string;
    token: string;
    amount: number;
    cardOwnerInformation: CardOwnerInformation;
    numOfPayments?: number;
    document?: DocumentInfo;
    customFields?: CustomField[];
  }): Promise<TransactionResponse> {
    return this.processTransaction({
      cardToken: params.token,
      userId: params.userId,
      amount: params.amount,
      cardOwnerInformation: params.cardOwnerInformation,
      numOfPayments: params.numOfPayments || 1,
      document: params.document,
      customFields: params.customFields,
      operation: 'ChargeOnly'
    });
  }
  
  /**
   * Charge payment using full card details
   */
  static async chargeWithCardDetails(params: {
    userId?: string;
    cardDetails: CardDetails;
    amount: number;
    cardOwnerInformation: CardOwnerInformation;
    numOfPayments?: number;
    document?: DocumentInfo;
    customFields?: CustomField[];
  }): Promise<TransactionResponse> {
    return this.processTransaction({
      cardDetails: params.cardDetails,
      userId: params.userId,
      amount: params.amount,
      cardOwnerInformation: params.cardOwnerInformation,
      numOfPayments: params.numOfPayments || 1,
      document: params.document,
      customFields: params.customFields,
      operation: 'ChargeOnly'
    });
  }
  
  /**
   * Charge and create token in one operation
   */
  static async chargeAndCreateToken(params: {
    userId?: string;
    cardDetails: CardDetails;
    amount: number;
    cardOwnerInformation: CardOwnerInformation;
    numOfPayments?: number;
    document?: DocumentInfo;
    customFields?: CustomField[];
  }): Promise<TransactionResponse> {
    return this.processTransaction({
      cardDetails: params.cardDetails,
      userId: params.userId,
      amount: params.amount,
      cardOwnerInformation: params.cardOwnerInformation,
      numOfPayments: params.numOfPayments || 1,
      document: params.document,
      customFields: params.customFields,
      operation: 'ChargeAndCreateToken'
    });
  }
  
  /**
   * Process a refund
   */
  static async processRefund(params: {
    userId?: string;
    token: string;
    amount: number;
    cardOwnerInformation: CardOwnerInformation;
    document?: DocumentInfo;
  }): Promise<TransactionResponse> {
    return this.processTransaction({
      cardToken: params.token,
      userId: params.userId,
      amount: params.amount,
      cardOwnerInformation: params.cardOwnerInformation,
      isRefund: true,
      document: params.document ? {
        ...params.document,
        documentType: params.document.documentType || 'ReceiptRefund'
      } : undefined,
      advanced: {
        isRefund: true
      }
    });
  }
  
  /**
   * Validate transaction inputs before processing
   */
  static validateTransactionInputs(params: {
    amount: number;
    cardToken?: string;
    cardDetails?: CardDetails;
    cardOwnerInformation?: CardOwnerInformation;
  }): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    // Validate amount
    if (!params.amount || params.amount <= 0) {
      errors.amount = 'סכום העסקה חייב להיות גדול מאפס';
    }
    
    // Validate card identification (either token or card details)
    if (!params.cardToken && !params.cardDetails) {
      errors.card = 'נדרשים פרטי כרטיס אשראי או טוקן תקף';
    }
    
    // If card details provided, validate them
    if (params.cardDetails) {
      if (!params.cardDetails.cardNumber?.trim()) {
        errors.cardNumber = 'מספר כרטיס הוא שדה חובה';
      } else if (!/^[0-9]{12,19}$/.test(params.cardDetails.cardNumber.replace(/\s/g, ''))) {
        errors.cardNumber = 'מספר כרטיס לא תקין';
      }
      
      if (!params.cardDetails.expirationMMYY?.trim()) {
        errors.expirationMMYY = 'תוקף כרטיס הוא שדה חובה';
      } else if (!/^(0[1-9]|1[0-2])[0-9]{2}$/.test(params.cardDetails.expirationMMYY)) {
        errors.expirationMMYY = 'תוקף כרטיס לא תקין (פורמט נדרש: MMYY)';
      }
    }
    
    // Validate card owner information
    if (params.cardOwnerInformation) {
      if (!params.cardOwnerInformation.fullName?.trim()) {
        errors.fullName = 'שם בעל הכרטיס הוא שדה חובה';
      }
      
      if (!params.cardOwnerInformation.email?.trim()) {
        errors.email = 'דואר אלקטרוני הוא שדה חובה';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.cardOwnerInformation.email)) {
        errors.email = 'דואר אלקטרוני לא תקין';
      }
      
      if (!params.cardOwnerInformation.phone?.trim()) {
        errors.phone = 'מספר טלפון הוא שדה חובה';
      }
      
      if (!params.cardOwnerInformation.identityNumber?.trim()) {
        errors.identityNumber = 'מספר תעודת זהות הוא שדה חובה';
      } else if (!/^\d{9}$/.test(params.cardOwnerInformation.identityNumber)) {
        errors.identityNumber = 'מספר תעודת זהות לא תקין';
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}
