import { supabase } from '@/integrations/supabase/client';
import { PaymentErrorData } from '../hooks/types';

/**
 * Map error codes to user-friendly messages
 */
export const mapErrorCode = (error: any): string => {
  const errorCode = error?.code || error?.errorCode || 'UNKNOWN_ERROR';
  
  switch (errorCode) {
    case 'card_declined':
      return 'CARD_DECLINED';
    case 'expired_card':
      return 'EXPIRED_CARD';
    case 'incorrect_cvc':
      return 'INCORRECT_CVC';
    case 'insufficient_funds':
      return 'INSUFFICIENT_FUNDS';
    case 'invalid_number':
      return 'INVALID_NUMBER';
    case 'rate_limit':
      return 'RATE_LIMIT';
    case 'timeout':
      return 'TIMEOUT';
    case 'network_error':
      return 'NETWORK_ERROR';
    case '605':
      return 'CARD_DECLINED';
    case '513':
      return 'EXPIRED_CARD';
    case '607':
      return 'INSUFFICIENT_FUNDS';
    case 'card_error':
      return 'CARD_ERROR';
    case 'SESSION_EXPIRED':
      return 'SESSION_EXPIRED';
    default:
      return 'UNKNOWN_ERROR';
  }
};

/**
 * Get user-friendly error message based on error code
 */
export const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'CARD_DECLINED':
      return 'כרטיס האשראי נדחה. אנא נסה כרטיס אחר או צור קשר עם חברת האשראי שלך.';
    case 'EXPIRED_CARD':
      return 'כרטיס האשראי פג תוקף. אנא עדכן את פרטי התשלום שלך.';
    case 'INCORRECT_CVC':
      return 'קוד ה-CVC שהזנת שגוי. אנא נסה שוב.';
    case 'INSUFFICIENT_FUNDS':
      return 'אין מספיק כסף בכרטיס. אנא השתמש בכרטיס אחר או נסה אמצעי תשלום חלופי.';
    case 'INVALID_NUMBER':
      return 'מספר כרטיס האשראי אינו חוקי. אנא בדוק את המספר ונסה שוב.';
    case 'RATE_LIMIT':
      return 'חריגה ממגבלת הפעולות. אנא נסה שוב מאוחר יותר.';
    case 'TIMEOUT':
      return 'זמן התשלום הסתיים. אנא נסה שוב.';
    case 'NETWORK_ERROR':
      return 'שגיאת רשת. אנא בדוק את החיבור שלך ונסה שוב.';
    case 'CARD_ERROR':
      return 'אירעה שגיאה עם הכרטיס. אנא נסה כרטיס אחר או פנה לתמיכה.';
    case 'SESSION_EXPIRED':
      return 'פג תוקף החיבור, אנא התחבר מחדש';
    default:
      return 'אירעה שגיאה לא ידועה. אנא נסה שוב או פנה לתמיכה.';
  }
};

/**
 * Check if the error is transient and can be retried
 */
export const isTransientError = (error: any): boolean => {
  const errorCode = error?.code || error?.errorCode || 'UNKNOWN_ERROR';
  
  switch (errorCode) {
    case 'timeout':
    case 'network_error':
      return true;
    default:
      return false;
  }
};

/**
 * Log payment error to database for tracking and analysis
 */
export const logPaymentError = async (
  error: any,
  userId?: string,
  context?: string,
  paymentDetails?: any
): Promise<PaymentErrorData> => {
  // Extract error info
  const errorCode = mapErrorCode(error);
  const errorMessage = getErrorMessage(errorCode);
  const errorDetails = {
    originalError: error?.message || 'Unknown error',
    stack: error?.stack,
    code: error?.code,
    details: error?.details
  };
  
  // Prepare error data
  const errorData = {
    errorCode,
    errorMessage,
    context,
    paymentDetails
  };
  
  try {
    // Log to payment_errors table
    await supabase.from('payment_errors').insert({
      user_id: userId || 'anonymous',
      error_code: errorCode,
      error_message: errorMessage,
      error_details: errorDetails,
      context,
      payment_details: paymentDetails
    });
    
    console.log('Payment error logged to database');
  } catch (dbError) {
    console.error('Failed to log payment error to database:', dbError);
  }
  
  // Return processed error data
  return errorData;
};

/**
 * Handle payment errors with consistent approach
 */
export const handlePaymentError = async (
  error: any,
  userId?: string,
  email?: string | null,
  tokenData?: any,
  options?: {
    recoveryUrl?: string;
    paymentDetails?: any;
  }
): Promise<PaymentErrorData> => {
  // Log error to database
  const errorData = await logPaymentError(
    error,
    userId,
    'payment-processing',
    options?.paymentDetails || {}
  );
  
  // Don't attempt recovery for certain error types
  if (isTransientError(error)) {
    console.log('Transient error, no recovery needed');
    return errorData;
  }
  
  try {
    // Create a recovery session for this error if appropriate
    const { savePaymentSession } = await import('../services/recoveryService');
    
    const sessionId = await savePaymentSession({
      userId,
      email: email || undefined,
      planId: options?.paymentDetails?.planId || 'unknown',
      paymentDetails: {
        ...options?.paymentDetails,
        tokenData,
        errorInfo: errorData
      }
    });
    
    if (sessionId) {
      console.log(`Created recovery session: ${sessionId}`);
    }
    
    return {
      ...errorData,
      recoverySessionId: sessionId || undefined
    };
  } catch (recoveryError) {
    console.error('Failed to create recovery session:', recoveryError);
    return errorData;
  }
};
