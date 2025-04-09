
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { handlePaymentError, savePaymentSession } from '../services/recoveryService';
import { useAuth } from '@/contexts/auth';

interface UsePaymentErrorHandlingProps {
  planId: string;
  onCardUpdate?: () => void;
  onAlternativePayment?: () => void;
}

export const usePaymentErrorHandling = ({ 
  planId,
  onCardUpdate,
  onAlternativePayment
}: UsePaymentErrorHandlingProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isRecovering, setIsRecovering] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<any>(null);
  
  // Check URL for recovery parameter
  const checkForRecovery = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const recoveryId = urlParams.get('recover');
    
    if (recoveryId) {
      setIsRecovering(true);
      setSessionId(recoveryId);
      
      try {
        // Get session data
        const sessionData = await getRecoverySession(recoveryId);
        
        if (!sessionData) {
          toast.error('לא נמצא מידע להשלמת התשלום או שפג תוקף הקישור');
          setIsRecovering(false);
          return;
        }
        
        // Prefill data from session
        return {
          planId: sessionData.plan_id,
          email: sessionData.email,
          paymentDetails: sessionData.payment_details
        };
      } catch (error) {
        console.error('Error recovering session:', error);
        setIsRecovering(false);
      }
    }
    
    return null;
  };
  
  // Handle payment error with recovery
  const handleError = async (error: any, paymentDetails?: any) => {
    setLastError(error);
    
    // Create session ID for potential recovery
    const newSessionId = await savePaymentSession({
      userId: user?.id,
      email: user?.email,
      planId,
      paymentDetails
    });
    
    if (newSessionId) {
      setSessionId(newSessionId);
    }
    
    // Process the error
    return handlePaymentError(
      error,
      user?.id,
      user?.email,
      newSessionId || sessionId,
      {
        shouldRetry: true,
        maxRetries: 2,
        paymentDetails,
        onCardUpdate,
        onAlternativePayment
      }
    );
  };
  
  return {
    handleError,
    checkForRecovery,
    isRecovering,
    sessionId,
    lastError
  };
};
