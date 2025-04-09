
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePaymentErrorHandlingProps {
  planId?: string;
  onCardUpdate?: () => void;
  onAlternativePayment?: () => void;
}

interface ErrorHandlingOptions {
  tokenData?: any;
  planId?: string;
  operationType?: number;
  userInfo?: { userId?: string; email?: string } | null;
}

export const usePaymentErrorHandling = ({ 
  planId, 
  onCardUpdate, 
  onAlternativePayment 
}: UsePaymentErrorHandlingProps) => {
  const [searchParams] = useSearchParams();
  const [isRecovering, setIsRecovering] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Check for recovery parameters in URL
  useEffect(() => {
    const recover = searchParams.get('recover');
    const error = searchParams.get('error');
    
    if (recover && error === 'true') {
      setSessionId(recover);
      setIsRecovering(true);
    }
  }, [searchParams]);
  
  // Handle payment errors and recovery options
  const handleError = async (error: any, options?: ErrorHandlingOptions) => {
    console.error('Payment error:', error);
    
    // Try to extract relevant error information
    const errorCode = error.code || error.errorCode || 'unknown';
    const errorMessage = error.message || 'An unknown error occurred';
    
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
    if (options && (recoveryAction || options.userInfo?.email)) {
      try {
        // Create recovery URL
        const recoveryUrl = `${window.location.origin}/subscription?step=3&error=true&recover=${recoverySessionId}&plan=${options.planId || planId}`;
        
        // Store session for recovery
        await supabase.functions.invoke('recover-payment-session', {
          body: {
            email: options.userInfo?.email || '',
            errorInfo: {
              code: errorCode,
              message: errorMessage,
              recoveryAction,
              planId: options.planId || planId,
              operationType: options.operationType || 3,
              tokenDetails: options.tokenData ? {
                last4Digits: options.tokenData.lastFourDigits,
                expiry: `${options.tokenData.expiryMonth}/${options.tokenData.expiryYear}`,
              } : null
            },
            sessionId: recoverySessionId,
            recoveryUrl
          }
        });
        
        setSessionId(recoverySessionId);
      } catch (sessionError) {
        console.error('Failed to store recovery session:', sessionError);
      }
    }
    
    // Return error information
    return {
      errorCode,
      errorMessage: recoveryMessage || errorMessage,
      recoveryAction,
      recoverySessionId
    };
  };

  // Function to check if there's a recovery session to resume
  const checkForRecovery = async () => {
    if (!sessionId) return null;
    
    try {
      const { data, error } = await supabase
        .from('payment_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        // Ensure the session hasn't expired
        const expiryDate = new Date(data.expires_at);
        if (expiryDate > new Date()) {
          return data;
        } else {
          console.log('Recovery session has expired');
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error checking recovery session:', error);
      return null;
    }
  };

  return {
    handleError,
    checkForRecovery,
    isRecovering,
    sessionId
  };
};
