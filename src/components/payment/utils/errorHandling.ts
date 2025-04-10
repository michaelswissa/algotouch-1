
import { supabase } from '@/integrations/supabase/client';

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
      case 404: return 'service_unavailable'; // שגיאת 404 - SDK לא נמצא
      default: return `cardcom_${error.ReturnValue}`;
    }
  }

  // Handle SDK loading errors
  if (error?.message?.includes('load') && error?.message?.includes('SDK')) {
    return 'sdk_load_failed';
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
    case 'sdk_load_failed':
      return 'לא ניתן לטעון את מערכת התשלום. אנא נסה שוב מאוחר יותר.';
    case 'service_unavailable':
      return 'שירות הסליקה אינו זמין כרגע. אנא נסה שוב מאוחר יותר.';
    default:
      return 'אירעה שגיאה בתהליך התשלום. נסה שנית.';
  }
}

/**
 * Checks if an error is transient (temporary) and can be retried
 */
export function isTransientError(code: string): boolean {
  return ['network_error', 'timeout', 'server_error', 'sdk_load_failed', 'service_unavailable'].includes(code);
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
    const errorCode = typeof error?.code === 'string' ? error.code : mapErrorCode(error);
    const errorMessage = error?.message || JSON.stringify(error);
    
    // Log to console in all cases
    console.error('Payment error:', { errorCode, errorMessage, userId, context, additionalData });

    if (!userId) {
      return;
    }

    const errorToLog = {
      user_id: userId,
      error_code: errorCode,
      error_message: errorMessage,
      context: context || 'payment_processing',
      additional_data: additionalData || {},
      created_at: new Date().toISOString(),
      sdk_info: {
        window_cardcom_exists: typeof window !== 'undefined' && !!window.Cardcom,
        script_loaded: document.getElementById('cardcom-sdk') !== null
      }
    };
    
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
