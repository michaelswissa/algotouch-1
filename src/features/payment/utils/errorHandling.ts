
import { supabase } from '@/integrations/supabase/client';
import { PaymentServiceError } from '../types';

export const handlePaymentError = async (
  error: any, 
  userId?: string, 
  email?: string, 
  transactionId?: string,
  additionalData?: any
) => {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error && 'details' in error ? (error as any).details : undefined;
    const errorContext = error instanceof Error && 'context' in error ? (error as any).context : 'payment_service';
    
    // Log to console
    console.error(`[${errorContext}] Payment error:`, errorMessage, {
      userId,
      email,
      transactionId,
      ...(additionalData || {}),
      ...(errorDetails || {})
    });
    
    // Log to the database if possible - using system_logs instead of payment_logs
    const logPayload = {
      function_name: 'payment_error_handler',
      level: 'error',
      message: errorMessage,
      details: {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        userId: userId || 'anonymous',
        context: errorContext,
        email,
        transactionId,
        timestamp: new Date().toISOString(),
        ...(additionalData || {}),
        ...(errorDetails || {})
      }
    };
    
    await supabase.from('system_logs').insert(logPayload);
  } catch (logError) {
    // Just log to console if logging to the database fails
    console.error('Failed to log payment error:', logError);
  }
};

// Maintain this alias for backward compatibility
export const logPaymentError = handlePaymentError;

export const createPaymentError = (message: string, code: string, details: any): PaymentServiceError => {
  const error = new Error(message) as PaymentServiceError;
  error.code = code;
  error.details = details;
  error.context = 'payment_service';
  return error;
};
