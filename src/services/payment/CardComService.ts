
import { toast } from 'sonner';
import { PaymentLogger } from './PaymentLogger';
import { supabase } from '@/integrations/supabase/client';

interface PaymentInitializationParams {
  planId: string;
  userId: string | null;
  email: string;
  fullName: string;
  phone: string;
  idNumber: string;
  operationType?: 'payment' | 'token_only';
}

interface PaymentInitializationResult {
  sessionId: string;
  reference: string;
  terminalNumber: string;
  cardcomUrl: string;
  redirectUrl: string;
  iframeUrl: string;
  url: string; // For backward compatibility
  lowProfileId: string;
  lowProfileCode: string; // For backward compatibility
}

export class CardComService {
  static async initializePayment(params: PaymentInitializationParams): Promise<PaymentInitializationResult> {
    try {
      const { planId, userId, email, fullName, phone, idNumber, operationType = 'payment' } = params;
      
      PaymentLogger.log('Initializing payment', { 
        planId, 
        operationType, 
        email,
        hasPhone: Boolean(phone),
        hasIdNumber: Boolean(idNumber)
      });
      
      // Map operationType to CardCom operation types
      let mappedOperationType: string;
      
      switch (operationType) {
        case 'token_only':
          mappedOperationType = 'CreateTokenOnly'; // Use the actual CardCom operation name
          break;
        case 'payment':
        default:
          mappedOperationType = 'ChargeOnly'; // Use the actual CardCom operation name
          break;
      }
      
      // Call our cardcom-iframe Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-iframe', {
        body: {
          planId,
          userId,
          email,
          fullName,
          phone,
          idNumber,
          operationType: mappedOperationType
        }
      });
      
      if (error) {
        PaymentLogger.error('Error from cardcom-iframe function:', error);
        throw new Error(`Payment initialization failed: ${error.message || 'Unknown error'}`);
      }
      
      if (!data) {
        throw new Error('No data received from payment service');
      }
      
      PaymentLogger.log('Payment initialization response:', data);
      
      if (!data.success) {
        const errorMessage = data.message || `API error (unknown)`;
        throw new Error(errorMessage);
      }
      
      // Check for different URL formats in the response
      const iframeUrl = data.data.url || data.data.iframeUrl || '';
      const lowProfileId = data.data.lowProfileId || data.data.LowProfileId || '';
      
      // Log the iframe URL we received
      PaymentLogger.log('Payment initialization success, iframe URL received:', iframeUrl);
      
      return {
        sessionId: data.data.sessionId,
        reference: data.data.reference,
        terminalNumber: data.data.terminalNumber || '',
        cardcomUrl: 'https://secure.cardcom.solutions',
        // Ensure iframe URL is prioritized and available in all expected properties
        redirectUrl: iframeUrl,
        iframeUrl: iframeUrl,
        url: iframeUrl,
        lowProfileId: lowProfileId,
        lowProfileCode: lowProfileId // Map lowProfileId to lowProfileCode for backward compatibility
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing payment';
      PaymentLogger.error('Payment initialization error', error);
      toast.error(errorMessage);
      throw error;
    }
  }

  static async checkPaymentStatus(sessionId: string): Promise<{
    success: boolean;
    message: string;
    status: string;
  }> {
    try {
      // Use Supabase Functions API to check payment status
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
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
  
  // חדש: מטפל בפרמטרים של ההפניה לאחר התשלום
  static handleRedirectParameters(urlParams: URLSearchParams): {
    sessionId: string | null;
    reference: string | null;
    status: 'success' | 'failed' | 'unknown';
    lowProfileCode: string | null;
    responseCode: number;
  } {
    const sessionId = urlParams.get('session_id');
    const reference = urlParams.get('ref');
    const terminalNumber = urlParams.get('terminalnumber');
    const lowProfileCode = urlParams.get('lowprofilecode');
    const responseCode = Number(urlParams.get('ResponseCode') || urlParams.get('ResponeCode') || '-1');
    
    PaymentLogger.log('Redirect parameters received:', {
      sessionId,
      reference,
      terminalNumber,
      lowProfileCode,
      responseCode
    });
    
    // בדיקת הסטטוס על פי קוד התגובה
    let status: 'success' | 'failed' | 'unknown' = 'unknown';
    
    if (responseCode === 0) {
      status = 'success';
    } else if (responseCode > 0) {
      status = 'failed';
    }
    
    return {
      sessionId,
      reference,
      status,
      lowProfileCode,
      responseCode
    };
  }
}
