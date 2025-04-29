
import { toast } from 'sonner';
import { PaymentLogger } from './PaymentLogger';
import { supabase } from '@/integrations/supabase/client';

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

export class CardComService {
  static async initializePayment(params: PaymentInitializationParams): Promise<PaymentInitializationResult> {
    try {
      const { planId, userId, email, fullName, operationType = 'payment' } = params;
      
      PaymentLogger.log('Initializing payment', { planId, operationType, email });
      
      // Use Supabase Functions API to call the edge function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          userId,
          email,
          fullName,
          operationType: operationType === 'token_only' ? 'token_only' : 'payment',
          isIframePrefill: true
        }
      });
      
      if (error) {
        PaymentLogger.error('Error from cardcom-payment function:', error);
        throw new Error(`Payment initialization failed: ${error.message || 'Unknown error'}`);
      }
      
      if (!data) {
        throw new Error('No data received from payment service');
      }
      
      PaymentLogger.log('Payment initialization response:', data);
      
      const result = data;
      
      if (!result.success) {
        const errorMessage = result.message || `API error (unknown)`;
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
      // Use Supabase Functions API to check payment status
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode,
          sessionId
        }
      });
      
      if (error) {
        PaymentLogger.error('Error checking payment status via function:', error);
        throw new Error(`Status check failed: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No data received from status check');
      }
      
      PaymentLogger.log('Payment status check result', data);
      
      return {
        success: data.success,
        message: data.message || '',
        status: data.data?.status || 'unknown'
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
