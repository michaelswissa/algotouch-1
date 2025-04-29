
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
      
      // Check if the response is valid JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If the response is not JSON, read it as text and display a detailed error
        const textResponse = await response.text();
        PaymentLogger.error('Non-JSON response received:', textResponse.substring(0, 500)); // Log the first 500 chars
        throw new Error(`Server communication error: Invalid response (${response.status})`);
      }
      
      // Now safely parse the JSON
      let result;
      try {
        result = await response.json();
      } catch (error) {
        if (error instanceof SyntaxError) {
          // JSON parsing error
          PaymentLogger.error('JSON parsing error:', error);
          throw new Error('Error parsing server response');
        }
        throw error;
      }
      
      if (!response.ok || !result.success) {
        const errorMessage = result.message || `API error (${response.status})`;
        throw new Error(errorMessage);
      }
      
      PaymentLogger.log('Payment initialization success', result);
      
      // Validate that all required fields are present in the response
      const { lowProfileId, sessionId, reference, terminalNumber, cardcomUrl } = result.data;
      
      if (!lowProfileId || !sessionId || !terminalNumber) {
        throw new Error('Missing required payment details in server response');
      }
      
      return {
        lowProfileId,
        sessionId,
        reference,
        terminalNumber,
        cardcomUrl: cardcomUrl || 'https://secure.cardcom.solutions',
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
      
      // Check if the response is valid JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If the response is not JSON, read it as text and log for debugging
        const textResponse = await response.text();
        PaymentLogger.error('Non-JSON response received from status check:', textResponse.substring(0, 500));
        throw new Error(`Server communication error: Invalid status response (${response.status})`);
      }
      
      let result;
      try {
        result = await response.json();
      } catch (error) {
        if (error instanceof SyntaxError) {
          // JSON parsing error
          PaymentLogger.error('JSON parsing error in status check:', error);
          throw new Error('Error parsing server status response');
        }
        throw error;
      }
      
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
