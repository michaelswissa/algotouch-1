
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
    
    // Log to the database if possible
    const logPayload = {
      user_id: userId || 'anonymous',
      level: 'error',
      message: errorMessage,
      context: errorContext || 'payment_service',
      source: 'frontend',
      details: {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        email,
        transactionId,
        timestamp: new Date().toISOString(),
        ...(additionalData || {}),
        ...(errorDetails || {})
      }
    };
    
    await supabase.from('payment_logs').insert(logPayload);
  } catch (logError) {
    // Just log to console if logging to the database fails
    console.error('Failed to log payment error:', logError);
  }
};

export const logPaymentError = handlePaymentError;

export const createPaymentError = (message: string, code: string, details: any): PaymentServiceError => {
  const error = new Error(message) as PaymentServiceError;
  error.code = code;
  error.details = details;
  error.context = 'payment_service';
  return error;
};
