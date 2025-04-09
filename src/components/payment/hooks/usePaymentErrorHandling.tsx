
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { savePaymentSession, getRecoverySession } from '../services/recoveryService';
import { PaymentError } from './types';
import { getErrorMessage, mapErrorCode, isTransientError, logPaymentError } from '../utils/errorHandling';

interface UsePaymentErrorHandlingProps {
  planId?: string;
  onCardUpdate?: () => void;
  onAlternativePayment?: () => void;
}

export const usePaymentErrorHandling = ({ 
  planId, 
  onCardUpdate, 
  onAlternativePayment 
}: UsePaymentErrorHandlingProps) => {
  const [searchParams] = useSearchParams();
  const [isRecovering, setIsRecovering] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recoveryData, setRecoveryData] = useState<any>(null);
  
  // Check for recovery parameters in URL
  useEffect(() => {
    const recover = searchParams.get('recover');
    const error = searchParams.get('error');
    
    const checkRecoverySession = async () => {
      if (recover) {
        setSessionId(recover);
        setIsRecovering(true);
        
        try {
          const sessionData = await getRecoverySession(recover);
          if (sessionData) {
            setRecoveryData(sessionData);
            toast.info('נמצאו פרטי תשלום שנשמרו בעסקה קודמת');
          } else {
            setIsRecovering(false);
            setSessionId(null);
            if (error === 'true') {
              toast.error('שגיאה בעיבוד התשלום, אנא נסה שנית');
            }
          }
        } catch (sessionError) {
          console.error('Failed to get recovery session:', sessionError);
          setIsRecovering(false);
          setSessionId(null);
        }
      }
    };
    
    checkRecoverySession();
  }, [searchParams]);
  
  // Handle payment errors and recovery options
  const handleError = async (error: any, options?: {
    tokenData?: any;
    planId?: string;
    operationType?: number;
    userInfo?: { userId?: string; email?: string } | null;
  }) => {
    console.error('Payment error:', error);
    
    // Try to extract relevant error information
    const errorCode = mapErrorCode(error);
    const errorMessage = getErrorMessage(errorCode);
    
    // Create a unique session ID if we're going to attempt recovery
    const recoverySessionId = crypto.randomUUID();
    
    // Determine recovery action based on error type
    let recoveryAction = null;
    let recoveryMessage = null;
    
    // Handle specific error types
    if (errorCode === 'card_declined' || errorCode === '605' || errorCode === 'card_error') {
      recoveryAction = 'update_card';
      recoveryMessage = 'כרטיס האשראי נדחה. נסה כרטיס אחר.';
    } else if (errorCode === 'expired_card' || errorCode === '513') {
      recoveryAction = 'update_card';
      recoveryMessage = 'כרטיס האשראי שהזנת פג תוקף. נא להזין כרטיס תקף.';
    } else if (errorCode === 'insufficient_funds' || errorCode === '607') {
      recoveryAction = 'alternative_payment';
      recoveryMessage = 'אין מספיק יתרה בכרטיס. נסה כרטיס אחר או אמצעי תשלום חלופי.';
    } else if (errorCode === 'network_error' || errorCode === 'timeout') {
      recoveryAction = 'retry';
      recoveryMessage = 'אירעה שגיאת תקשורת. נסה שנית.';
    }
    
    // Save error information for recovery if possible
    const userId = options?.userInfo?.userId;
    const userEmail = options?.userInfo?.email;
    
    if (recoveryAction || userEmail) {
      try {
        // Save session for recovery
        const savedSessionId = await savePaymentSession({
          userId,
          email: userEmail,
          planId: options?.planId || planId || 'unknown',
          paymentDetails: {
            errorInfo: {
              code: errorCode,
              message: errorMessage,
              recoveryAction,
              operationType: options?.operationType || 3,
              tokenDetails: options?.tokenData || null
            },
            ...options
          }
        });
        
        if (savedSessionId) {
          setSessionId(savedSessionId);
          
          // Log error to database
          await logPaymentError(
            error,
            userId,
            'payment_error_handling',
            {
              recoverySessionId: savedSessionId,
              ...options
            }
          );
        }
      } catch (sessionError) {
        console.error('Failed to store recovery session:', sessionError);
      }
    }
    
    // Create PaymentError object with recovery info
    const paymentError = new PaymentError(
      recoveryMessage || errorMessage,
      errorCode,
      error.details || error
    );
    
    paymentError.recoverySessionId = sessionId || recoverySessionId;
    paymentError.recoveryAction = recoveryAction as any;
    
    // Return error information
    return paymentError;
  };

  // Function to check if there's a recovery session to resume
  const checkForRecovery = async () => {
    if (!sessionId) return null;
    
    try {
      const sessionData = await getRecoverySession(sessionId);
      return sessionData;
    } catch (error) {
      console.error('Error checking recovery session:', error);
      return null;
    }
  };

  return {
    handleError,
    checkForRecovery,
    isRecovering,
    sessionId,
    recoveryData
  };
};
