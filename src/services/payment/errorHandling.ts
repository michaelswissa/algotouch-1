
/**
 * Payment Error Handling Service
 * Centralized error handling for payment flows
 */

import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';

// Define error code map
const ERROR_CODE_MAP: Record<string, string> = {
  '005': 'INSUFFICIENT_FUNDS',
  '033': 'EXPIRED_CARD',
  '036': 'RESTRICTED_CARD',
  '054': 'EXPIRED_CARD',
  '057': 'SERVICE_NOT_ALLOWED',
  '101': 'DECLINED',
  '107': 'CALL_ISSUER',
  '118': 'INVALID_TRANSACTION',
  '200': 'FRAUD_SUSPICION',
  '999': 'GENERAL_ERROR',
  'AUTH_ERROR': 'SESSION_EXPIRED'
};

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  'INSUFFICIENT_FUNDS': 'אין מספיק כיסוי בכרטיס. נסה כרטיס אחר או אמצעי תשלום חלופי.',
  'EXPIRED_CARD': 'הכרטיס פג תוקף. אנא הזן פרטי כרטיס עדכניים.',
  'RESTRICTED_CARD': 'הכרטיס מוגבל לשימוש. נסה כרטיס אחר.',
  'SERVICE_NOT_ALLOWED': 'השירות אינו מורשה לכרטיס זה. נסה כרטיס אחר.',
  'DECLINED': 'העסקה נדחתה על ידי חברת האשראי. נסה שנית או השתמש בכרטיס אחר.',
  'CALL_ISSUER': 'יש צורך ליצור קשר עם חברת האשראי. נסה כרטיס אחר.',
  'INVALID_TRANSACTION': 'פרטי העסקה שגויים. נסה שנית.',
  'FRAUD_SUSPICION': 'העסקה חשודה כהונאה. נסה כרטיס אחר או צור קשר עם התמיכה.',
  'GENERAL_ERROR': 'אירעה שגיאה בעיבוד התשלום. נסה שנית.',
  'SESSION_EXPIRED': 'פג תוקף החיבור, אנא התחבר מחדש.',
  'INVALID_CARD': 'פרטי הכרטיס שגויים. אנא בדוק את המספר, תוקף וקוד האבטחה.',
  'NETWORK_ERROR': 'בעיית תקשורת. בדוק את חיבור האינטרנט ונסה שנית.',
  'SERVER_ERROR': 'שגיאה בשרת. אנא נסה שנית מאוחר יותר.',
  'DEFAULT': 'שגיאה בלתי צפויה. אנא נסה שנית.'
};

// Error types for classification
export enum ErrorType {
  CARD_ERROR = 'card_error',
  NETWORK_ERROR = 'network_error',
  AUTHORIZATION_ERROR = 'auth_error',
  SERVER_ERROR = 'server_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Error info interface
export interface ErrorInfo {
  errorCode: string;
  errorMessage: string;
  errorType: ErrorType;
  isRecoverable: boolean;
  originalError: any;
}

/**
 * Map error response to standardized code
 */
export function mapErrorCode(error: any): string {
  // Extract error code based on different possible structures
  let errorCode: string = 'DEFAULT';
  
  if (typeof error === 'string') {
    errorCode = error;
  } else if (error?.message?.includes('Auth')) {
    errorCode = 'AUTH_ERROR';
  } else if (error?.code) {
    errorCode = error.code;
  } else if (error?.details?.code) {
    errorCode = error.details.code;
  } else if (error?.error?.code) {
    errorCode = error.error.code;
  } else if (error?.responseCode) {
    errorCode = error.responseCode;
  }
  
  // Map to standardized code or return original
  return ERROR_CODE_MAP[errorCode] || errorCode;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.DEFAULT;
}

/**
 * Check if the error is recoverable (transient)
 */
export function isTransientError(errorCode: string): boolean {
  const transientErrors = [
    'NETWORK_ERROR',
    'SERVER_ERROR',
    'SERVICE_UNAVAILABLE',
    'TIMEOUT'
  ];
  
  return transientErrors.includes(errorCode);
}

/**
 * Classify error type
 */
export function classifyError(error: any): ErrorType {
  const errorStr = typeof error === 'string' 
    ? error 
    : JSON.stringify(error);
    
  if (errorStr.includes('network') || 
      errorStr.includes('connection') || 
      errorStr.includes('timeout')) {
    return ErrorType.NETWORK_ERROR;
  }
  
  if (errorStr.includes('auth') || 
      errorStr.includes('session') || 
      errorStr.includes('token') || 
      errorStr.includes('permission')) {
    return ErrorType.AUTHORIZATION_ERROR;
  }
  
  if (errorStr.includes('card') || 
      errorStr.includes('payment') || 
      errorStr.includes('transaction')) {
    return ErrorType.CARD_ERROR;
  }
  
  if (errorStr.includes('server') || 
      errorStr.includes('500') || 
      errorStr.includes('503')) {
    return ErrorType.SERVER_ERROR;
  }
  
  return ErrorType.UNKNOWN_ERROR;
}

/**
 * Process and handle payment error
 */
export function processPaymentError(error: any): ErrorInfo {
  const errorCode = mapErrorCode(error);
  const errorMessage = getErrorMessage(errorCode);
  const errorType = classifyError(error);
  const isRecoverable = isTransientError(errorCode);
  
  // Show error toast for user feedback
  toast.error(errorMessage);
  
  return {
    errorCode,
    errorMessage,
    errorType,
    isRecoverable,
    originalError: error
  };
}

/**
 * Log payment errors to database
 */
export async function logPaymentError(
  error: any,
  userId: string = 'anonymous',
  context: string = 'payment-processing',
  additionalData: any = null
): Promise<any> {
  try {
    // Process the error
    const errorInfo = typeof error === 'object' 
      ? processPaymentError(error)
      : { 
          errorCode: 'UNKNOWN', 
          errorMessage: String(error),
          errorType: ErrorType.UNKNOWN_ERROR,
          isRecoverable: false,
          originalError: error 
        };
    
    // Prepare log data
    const logData = {
      userId,
      context,
      timestamp: new Date().toISOString(),
      errorMessage: errorInfo.errorMessage,
      errorCode: errorInfo.errorCode,
      errorType: errorInfo.errorType,
      rawError: JSON.stringify(error),
      paymentDetails: additionalData ? JSON.stringify(additionalData) : null,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Log to the database
    const { data, error: logError } = await supabase.functions.invoke('log-payment-error', {
      body: logData
    });
    
    if (logError) {
      console.error('Failed to log payment error:', logError);
    }
    
    return { ...errorInfo, logId: data?.logId };
  } catch (e) {
    console.error('Error in logPaymentError:', e);
    return null;
  }
}
