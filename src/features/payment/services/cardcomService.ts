
import { supabase } from '@/integrations/supabase/client';
import { 
  TokenizationOptions, 
  TokenizationResult,
  PaymentVerificationResult,
  PaymentServiceError 
} from '../types';
import { TokenData } from '@/types/payment';

/**
 * Creates a payment iframe URL for tokenization through Cardcom
 */
export const createTokenizationUrl = async (options: TokenizationOptions): Promise<TokenizationResult> => {
  try {
    // Call the iframe-redirect function
    const { data, error } = await supabase.functions.invoke('iframe-redirect', {
      body: {
        terminalNumber: options.terminalNumber,
        apiName: options.apiName,
        amount: options.amount,
        successUrl: options.successUrl,
        failedUrl: options.errorUrl,
        webhookUrl: options.webhookUrl,
        productName: options.productName || 'AlgoTouch Subscription',
        returnValue: options.returnValue || '',
        language: options.language || 'he',
        operation: options.operation || 'ChargeAndCreateToken',
        uiDefinition: {
          IsHideCardOwnerName: false,
          CardOwnerNameValue: options.fullName || '',
          IsHideCardOwnerEmail: false,
          CardOwnerEmailValue: options.email || '',
          IsHideCardOwnerPhone: false
        }
      }
    });
    
    if (error) {
      throw createPaymentError(`Error calling iframe-redirect: ${error.message}`, 'iframe_creation', {
        options: { ...options, apiName: '***' }, // Mask sensitive data
        error
      });
    }
    
    if (!data || !data.Url) {
      throw createPaymentError('Invalid response from payment gateway', 'invalid_response', {
        data
      });
    }
    
    return {
      success: true,
      url: data.Url,
      lowProfileId: data.LowProfileId
    };
  } catch (err: any) {
    console.error('Error creating tokenization URL:', err);
    
    return {
      success: false,
      error: err.message || 'שגיאה ביצירת עמוד התשלום'
    };
  }
};

/**
 * Verifies a payment using the lowProfileId
 */
export const verifyPayment = async (lowProfileId: string): Promise<PaymentVerificationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-cardcom-payment', {
      body: { lowProfileId }
    });

    if (error) {
      throw createPaymentError(`Error verifying payment: ${error.message}`, 'verification', {
        lowProfileId,
        error
      });
    }

    return data as PaymentVerificationResult;
  } catch (err: any) {
    console.error('Payment verification error:', err);
    
    return {
      success: false,
      error: err.message || 'שגיאה באימות התשלום',
      message: err.message || 'שגיאה באימות התשלום'
    };
  }
};

/**
 * Stores a payment token for a user
 */
export const storePaymentToken = async (
  userId: string,
  tokenData: TokenData
): Promise<{ success: boolean; tokenId?: string; error?: string }> => {
  try {
    // Ensure the token is a string
    const token = String(tokenData.token || `fallback_${Date.now()}`);
    
    // Store the token in the database
    const { data, error } = await supabase
      .from('payment_tokens')
      .insert({
        user_id: userId,
        token: token,
        token_expiry: `${tokenData.expiryYear}-${tokenData.expiryMonth}-01`,
        card_last_four: tokenData.lastFourDigits,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      throw createPaymentError(`Error storing token: ${error.message}`, 'token_storage', {
        userId,
        error
      });
    }
    
    return { success: true, tokenId: data.id };
  } catch (err: any) {
    console.error('Error storing payment token:', err);
    logPaymentError(err, userId);
    
    return { success: false, error: err.message };
  }
};

/**
 * Process a webhook notification from Cardcom
 */
export const processWebhookByEmail = async (
  email: string,
  lowProfileId?: string,
  userId?: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('reprocess-webhook-by-email', {
      body: { 
        email,
        lowProfileId,
        userId,
        forceRefresh: true
      }
    });
    
    if (error) {
      throw createPaymentError(`Webhook processing error: ${error.message}`, 'webhook_processing', {
        email,
        lowProfileId,
        userId,
        error
      });
    }
    
    return data as { success: boolean; message?: string };
  } catch (err: any) {
    console.error('Error processing webhook:', err);
    
    return {
      success: false,
      error: err.message || 'שגיאה בעיבוד אירוע תשלום'
    };
  }
};

/**
 * Helper function to create standardized payment errors
 */
function createPaymentError(message: string, code: string, details: any): PaymentServiceError {
  const error = new Error(message) as PaymentServiceError;
  error.code = code;
  error.details = details;
  error.context = 'payment_service';
  return error;
}

/**
 * Helper function to log payment errors
 */
export const logPaymentError = async (
  error: any, 
  userId?: string, 
  context: string = 'payment_service',
  additionalData?: any
) => {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error && 'details' in error ? (error as any).details : undefined;
    
    // Log to console
    console.error(`[${context}] Payment error:`, errorMessage, {
      userId,
      ...(additionalData || {}),
      ...(errorDetails || {})
    });
    
    // Log to the database if we have a userId
    if (userId) {
      await supabase.from('payment_logs').insert({
        user_id: userId,
        level: 'error',
        message: errorMessage,
        context: context,
        details: {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          ...(additionalData || {}),
          ...(errorDetails || {})
        }
      });
    }
  } catch (logError) {
    // Just log to console if logging to the database fails
    console.error('Failed to log payment error:', logError);
  }
};
