
import { supabase } from '@/integrations/supabase/client';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

type OperationType = 'payment' | 'token_only';

interface CardComPaymentInitParams {
  planId: string;
  userId: string | null;
  email: string;
  fullName: string;
  phone: string;
  idNumber: string;
  operationType: OperationType;
}

interface CardComRedirectParams {
  lowProfileCode: string;
  responseCode: string;
  sessionId: string;
  status: 'success' | 'failed' | 'unknown';
  allParams: Record<string, string>;
}

/**
 * Service for handling CardCom payment processing and redirects
 */
export class CardComService {
  /**
   * Parses redirect URL parameters from CardCom
   */
  static handleRedirectParameters(searchParams: URLSearchParams): CardComRedirectParams {
    // Extract common parameters
    const lowProfileCode = searchParams.get('LowProfileCode') || '';
    const responseCode = searchParams.get('ResponseCode') || '';
    const sessionId = searchParams.get('session_id') || '';
    
    // Determine success/failure status
    let status: 'success' | 'failed' | 'unknown' = 'unknown';
    
    if (responseCode === '0') {
      status = 'success';
    } else if (responseCode && responseCode !== '0') {
      status = 'failed';
    } else if (window.location.pathname.includes('success')) {
      status = 'success';
    } else if (window.location.pathname.includes('failed')) {
      status = 'failed';
    }
    
    return {
      lowProfileCode,
      responseCode,
      sessionId,
      status,
      // Include all other parameters for debugging
      allParams: Object.fromEntries(searchParams.entries())
    };
  }

  /**
   * Initializes a payment session with CardCom
   */
  static async initializePayment(params: CardComPaymentInitParams): Promise<{
    lowProfileCode: string;
    sessionId: string;
    terminalNumber: string;
    reference: string;
    cardcomUrl?: string;
    iframeUrl?: string;
  }> {
    try {
      PaymentLogger.log('Initializing CardCom payment', { 
        planId: params.planId,
        email: params.email,
        operationType: params.operationType
      });

      // Map operation type to CardCom format
      const cardcomOperation = params.operationType === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly';

      // Call the CardCom iframe initialization edge function
      const { data, error } = await supabase.functions.invoke('cardcom-iframe', {
        body: {
          planId: params.planId,
          userId: params.userId,
          email: params.email,
          fullName: params.fullName,
          phone: params.phone,
          idNumber: params.idNumber,
          operationType: cardcomOperation
        }
      });

      if (error) {
        PaymentLogger.error('Error from cardcom-iframe function:', error);
        throw new Error(`Failed to initialize payment: ${error.message}`);
      }

      if (!data?.success || !data?.data) {
        throw new Error(data?.message || 'Invalid response from payment service');
      }

      // Extract data from response
      const responseData = data.data;
      const lowProfileCode = responseData.lowProfileId || responseData.LowProfileId || '';
      const sessionId = responseData.sessionId || '';
      const terminalNumber = responseData.terminalNumber || '0';
      const reference = responseData.reference || '';
      const iframeUrl = responseData.url || responseData.iframeUrl || responseData.Url || '';
      const cardcomUrl = responseData.cardcomUrl || 'https://secure.cardcom.solutions';

      if (!lowProfileCode || !sessionId) {
        throw new Error('Missing required fields in payment initialization response');
      }

      PaymentLogger.log('Payment initialized successfully', {
        lowProfileCode,
        sessionId,
        terminalNumber,
        reference
      });

      return {
        lowProfileCode,
        sessionId,
        terminalNumber,
        reference,
        cardcomUrl,
        iframeUrl
      };
    } catch (error) {
      PaymentLogger.error('Error initializing payment:', error);
      throw error;
    }
  }

  /**
   * Checks the status of a payment
   */
  static async checkPaymentStatus(sessionId: string): Promise<{
    success: boolean;
    status: 'success' | 'processing' | 'failed' | 'cancelled' | 'unknown' | 'completed' | 'approved' | 'pending';
    message?: string;
    data?: any;
  }> {
    try {
      PaymentLogger.log('Checking payment status for session:', sessionId);

      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { sessionId }
      });

      if (error) {
        PaymentLogger.error('Error checking payment status:', error);
        return {
          success: false,
          status: 'unknown',
          message: `Error checking payment status: ${error.message}`
        };
      }

      if (!data?.success) {
        return {
          success: false,
          status: 'unknown',
          message: data?.message || 'Failed to retrieve payment status'
        };
      }

      // Map the status from the API response
      let status: 'success' | 'processing' | 'failed' | 'cancelled' | 'unknown' | 'completed' | 'approved' | 'pending' = 'unknown';
      if (data.data?.status === 'success' || data.data?.status === 'completed') {
        status = data.data.status;
      } else if (data.data?.status === 'processing' || data.data?.status === 'pending') {
        status = data.data.status;
      } else if (data.data?.status === 'failed') {
        status = 'failed';
      } else if (data.data?.status === 'cancelled') {
        status = 'cancelled';
      } else if (data.data?.status === 'approved') {
        status = 'approved';
      }

      return {
        success: true,
        status,
        message: data.data?.message || '',
        data: data.data
      };
    } catch (error) {
      PaymentLogger.error('Error in checkPaymentStatus:', error);
      return {
        success: false,
        status: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error checking payment status'
      };
    }
  }
}
