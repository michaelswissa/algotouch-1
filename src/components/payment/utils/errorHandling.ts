
import { supabase } from '@/integrations/supabase/client';
import { PaymentError } from '@/types/payment';

/**
 * Maps error codes from different sources to standardized error codes
 */
export function mapErrorCode(error: any): string {
  // If we already have a code, return it
  if (typeof error?.code === 'string') {
    return error.code;
  }

  // Handle Cardcom specific error codes
  if (error?.ReturnValue) {
    switch (error.ReturnValue) {
      case 605: return 'card_declined';
      case 513: return 'expired_card';
      case 607: return 'insufficient_funds';
      case 400: return 'invalid_request';
      default: return `cardcom_${error.ReturnValue}`;
    }
  }

  // Handle network errors
  if (error?.name === 'NetworkError' || error?.message?.includes('network')) {
    return 'network_error';
  }

  if (error?.message?.includes('timeout') || error?.name?.includes('Timeout')) {
    return 'timeout';
  }

  // Generic error fallback
  return 'payment_error';
}

/**
 * Gets a user-friendly error message based on error code
 */
export function getErrorMessage(code: string): string {
  switch (code) {
    case 'card_declined':
      return 'כרטיס האשראי נדחה. נסה כרטיס אחר.';
    case 'expired_card':
      return 'כרטיס האשראי שהזנת פג תוקף. נא להזין כרטיס תקף.';
    case 'insufficient_funds':
      return 'אין מספיק יתרה בכרטיס. נסה כרטיס אחר או אמצעי תשלום חלופי.';
    case 'network_error':
      return 'אירעה שגיאת תקשורת. נסה שנית.';
    case 'timeout':
      return 'פעולת התשלום נמשכה זמן רב מדי. נסה שנית.';
    case 'invalid_iframe':
      return 'שגיאה בטעינת טופס התשלום. נסה לרענן את הדף.';
    case 'token_creation_failed':
      return 'שגיאה ביצירת אסימון תשלום. נא לנסות שוב.';
    case 'payment_verification_failed':
      return 'אימות התשלום נכשל. אנא פנה לשירות לקוחות.';
    default:
      return 'אירעה שגיאה בתהליך התשלום. נסה שנית.';
  }
}

/**
 * Checks if an error is transient (temporary) and can be retried
 */
export function isTransientError(code: string): boolean {
  return ['network_error', 'timeout', 'server_error'].includes(code);
}

/**
 * Logs payment errors to the database for tracking
 */
export async function logPaymentError(
  error: any,
  userId?: string,
  context?: string,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    if (!userId) {
      console.error('Payment error (anonymous):', error);
      return;
    }

    const errorToLog = {
      user_id: userId,
      error_code: typeof error?.code === 'string' ? error.code : mapErrorCode(error),
      error_message: error?.message || JSON.stringify(error),
      context: context || 'payment_processing',
      additional_data: additionalData || {},
      created_at: new Date().toISOString()
    };

    // Log to console in all cases
    console.error('Payment error:', errorToLog);

    // If Supabase is available, log to database
    const { error: dbError } = await supabase
      .from('payment_errors')
      .insert(errorToLog);
    
    if (dbError) {
      console.error('Failed to log payment error to database:', dbError);
    }
  } catch (loggingError) {
    console.error('Error logging payment error:', loggingError);
  }
}
