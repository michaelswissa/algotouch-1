
import { toast } from 'sonner';
import { PaymentLogger } from './PaymentLogger';

interface PaymentInitializationParams {
  planId: string;
  userId: string | null;
  email: string;
  fullName: string;
  operationType?: 'payment' | 'token_only';
}

interface PaymentInitializationResult {
  lowProfileId: string;
  sessionId: string;
  reference: string;
  terminalNumber: string;
  cardcomUrl: string;
  url?: string;
}

const isLocalDevelopment = window.location.hostname === 'localhost';

export class CardComService {
  static async initializePayment(params: PaymentInitializationParams): Promise<PaymentInitializationResult> {
    try {
      const { planId, userId, email, fullName, operationType = 'payment' } = params;
      
      PaymentLogger.log('Initializing payment', { planId, operationType, email });
      
      // Use Supabase Edge Function to initialize payment session
      const apiUrl = '/api/cardcom-payment'; // Use relative URL
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          userId,
          email,
          fullName,
          operationType: operationType === 'token_only' ? 'token_only' : 'payment',
          // Setting this to true enables the iframe prefill mode for better user experience
          isIframePrefill: true
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      PaymentLogger.log('Payment initialization success', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Unknown error initializing payment');
      }
      
      return {
        lowProfileId: result.data.lowProfileId,
        sessionId: result.data.sessionId,
        reference: result.data.reference,
        terminalNumber: result.data.terminalNumber,
        cardcomUrl: result.data.cardcomUrl,
        url: result.data.url
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing payment';
      PaymentLogger.error('Payment initialization error', error);
      toast.error(errorMessage);
      throw error;
    }
  }

  static async checkPaymentStatus(lowProfileCode: string, sessionId: string): Promise<{
    success: boolean;
    message: string;
    status: string;
  }> {
    try {
      // Use Supabase Edge Function to check payment status
      const apiUrl = '/api/cardcom-status';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lowProfileCode,
          sessionId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      PaymentLogger.log('Payment status check result', result);
      
      return {
        success: result.success,
        message: result.message || '',
        status: result.data?.status || 'unknown'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking payment status';
      PaymentLogger.error('Payment status check error', error);
      return {
        success: false,
        message: errorMessage,
        status: 'error'
      };
    }
  }
}
