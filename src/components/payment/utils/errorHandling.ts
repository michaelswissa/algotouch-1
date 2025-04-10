
import { savePaymentSession } from '../services/recoveryService';
import { sendRecoveryEmail } from '../services/recoveryService';
import { PaymentError } from '@/types/payment';

/**
 * Handles payment errors, including saving recovery information and sending notifications
 */
export const handlePaymentError = async (
  error: any,
  context: {
    userId?: string;
    email?: string;
    planId?: string;
    tokenInfo?: any;
    operationType?: number;
  }
): Promise<PaymentError> => {
  console.error('Payment error occurred:', error, 'Context:', context);
  
  let errorCode = 'payment_failed';
  let errorMessage = 'אירעה שגיאה בתהליך התשלום';
  
  // Extract error information
  if (error?.message) {
    errorMessage = error.message;
  }
  
  if (error?.code) {
    errorCode = error.code;
  }
  
  // Determine if this error should create a recovery session
  const needsRecovery = ![
    'user_cancelled',
    'invalid_input',
    'card_declined_fraud',
  ].includes(errorCode);
  
  // Create a payment session for recovery if needed
  let sessionId = null;
  if (needsRecovery && context.planId) {
    try {
      sessionId = await savePaymentSession({
        userId: context.userId,
        email: context.email,
        planId: context.planId,
        paymentDetails: {
          tokenInfo: context.tokenInfo,
          operationType: context.operationType,
          lastErrorCode: errorCode,
          timestamp: new Date().toISOString()
        }
      });
      
      if (sessionId && context.email) {
        await sendRecoveryEmail(
          context.email,
          {
            code: errorCode,
            message: errorMessage,
            planId: context.planId,
          },
          sessionId
        );
      }
    } catch (recoveryError) {
      console.error('Error creating recovery session:', recoveryError);
    }
  }
  
  // Return formatted error info
  return {
    code: errorCode,
    message: errorMessage,
    raw: error
  };
};
