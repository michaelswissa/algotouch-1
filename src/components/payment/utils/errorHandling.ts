
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Common CardCom and payment provider error codes mapped to user-friendly messages
export const ERROR_CODES = {
  // CardCom specific error codes
  'CardcomError1': 'כרטיס אשראי לא תקין',
  'CardcomError2': 'יתרה לא מספקת בכרטיס',
  'CardcomError3': 'כרטיס חסום',
  'CardcomError4': 'שגיאה בעיבוד התשלום',
  'CardcomError5': 'עסקה נדחתה על ידי חברת האשראי',
  
  // Generic payment error codes
  'INSUFFICIENT_FUNDS': 'יתרה לא מספקת בכרטיס, נסה כרטיס אחר',
  'EXPIRED_CARD': 'כרטיס פג תוקף, אנא עדכן את פרטי הכרטיס',
  'INVALID_CARD': 'פרטי כרטיס אשראי שגויים',
  'PROCESSING_ERROR': 'שגיאה בעיבוד התשלום, אנא נסה שנית מאוחר יותר',
  'SERVER_ERROR': 'שגיאת שרת, אנא נסה שנית מאוחר יותר',
  'NETWORK_ERROR': 'שגיאת תקשורת, בדוק את החיבור לאינטרנט',
  'SESSION_EXPIRED': 'פג תוקף החיבור, אנא התחבר מחדש',
  'UNKNOWN_ERROR': 'שגיאה לא ידועה, אנא נסה שנית או צור קשר עם התמיכה'
};

// Map raw error codes from payment provider to our standardized codes
export const mapErrorCode = (error: any): string => {
  // Extract error code from different payment providers
  const originalCode = 
    error.code || 
    (error.details?.ResponseCode) || 
    (error.details?.errorCode) || 
    'UNKNOWN_ERROR';
  
  // Map CardCom specific error codes
  if (originalCode === '107' || originalCode === '106') return 'INSUFFICIENT_FUNDS';
  if (originalCode === '105') return 'EXPIRED_CARD';
  if (originalCode === '102' || originalCode === '103') return 'INVALID_CARD';
  if (originalCode >= '500' && originalCode < '600') return 'SERVER_ERROR';
  
  return originalCode;
};

// Get user-friendly error message 
export const getErrorMessage = (errorCode: string): string => {
  return ERROR_CODES[errorCode] || ERROR_CODES.UNKNOWN_ERROR;
};

// Determine if an error is transient and can be retried
export const isTransientError = (errorCode: string): boolean => {
  const transientErrorCodes = [
    'SERVER_ERROR', 
    'NETWORK_ERROR', 
    'PROCESSING_ERROR'
  ];
  return transientErrorCodes.includes(errorCode);
};

// Log detailed error for monitoring and debugging
export const logPaymentError = async (
  error: any, 
  userId: string | undefined, 
  context: string, 
  paymentDetails?: any
) => {
  try {
    const errorInfo = {
      userId: userId || 'anonymous',
      context,
      timestamp: new Date().toISOString(),
      errorMessage: error.message || 'Unknown error',
      errorCode: mapErrorCode(error),
      rawError: JSON.stringify(error),
      paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console for development
    console.error('Payment Error:', errorInfo);
    
    // Since the payment_errors table doesn't exist, just return the error info without storing it
    // We'll log this in the console instead
    console.warn('Payment error occurred, but cannot store in database (table not found):', errorInfo);

    return errorInfo;
  } catch (loggingError) {
    console.error('Error logging payment error:', loggingError);
    return null;
  }
};

// Handle different types of payment errors with appropriate actions
export const handlePaymentError = async (
  error: any,
  userId?: string,
  email?: string,
  sessionId?: string,
  options?: {
    shouldRetry?: boolean;
    maxRetries?: number;
    currentRetry?: number;
    paymentDetails?: any;
    onRetry?: () => Promise<any>;
    onAlternativePayment?: () => void;
    onCardUpdate?: () => void;
  }
) => {
  const errorCode = mapErrorCode(error);
  const errorMessage = getErrorMessage(errorCode);
  
  // Log the error
  const errorInfo = await logPaymentError(
    error, 
    userId, 
    'payment-processing', 
    options?.paymentDetails
  );
  
  // Display user-friendly message
  toast.error(errorMessage);
  
  // Handle specific error cases
  switch (errorCode) {
    case 'INSUFFICIENT_FUNDS':
      if (options?.onAlternativePayment) {
        options.onAlternativePayment();
      }
      break;
      
    case 'EXPIRED_CARD':
      if (options?.onCardUpdate) {
        options.onCardUpdate();
      }
      break;
      
    case 'SESSION_EXPIRED':
      toast.error('פג תוקף החיבור, אנא התחבר מחדש');
      // Redirect to login page
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1500);
      break;
      
    default:
      // For transient errors, implement retry logic
      if (isTransientError(errorCode) && options?.shouldRetry && options.onRetry) {
        const maxRetries = options.maxRetries || 3;
        const currentRetry = options.currentRetry || 1;
        
        if (currentRetry <= maxRetries) {
          const delay = Math.pow(2, currentRetry) * 1000; // Exponential backoff
          toast.warning(`מנסה שנית... ניסיון ${currentRetry} מתוך ${maxRetries}`);
          
          setTimeout(async () => {
            try {
              await options.onRetry();
            } catch (retryError) {
              handlePaymentError(retryError, userId, email, sessionId, {
                ...options,
                currentRetry: currentRetry + 1
              });
            }
          }, delay);
          return;
        }
      }
      
      // Send recovery email for persistent errors
      if (email && userId && sessionId) {
        // Import the function here to avoid circular dependencies
        import('../services/recoveryService').then(({ sendRecoveryEmail }) => {
          sendRecoveryEmail(email, errorInfo, sessionId);
        });
      }
  }
  
  return errorInfo;
};
