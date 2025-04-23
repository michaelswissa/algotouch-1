
import { useState, useCallback, useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const [lowProfileCode, setLowProfileCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [planId, setPlanId] = useState<string>('');
  
  const cleanupStatusCheck = useCallback(() => {
    if (intervalId) {
      console.log('Clearing payment status check interval:', intervalId);
      clearInterval(intervalId);
      setIntervalId(null);
      setAttempt(0);
      setLowProfileCode(null);
      setSessionId(null);
    }
  }, [intervalId]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);
  
  const checkPaymentStatus = useCallback(async () => {
    if (!lowProfileCode || !sessionId) {
      console.error('Missing required parameters for payment status check');
      return false;
    }
    
    console.log(`Checking payment status (attempt ${attempt}):`, { lowProfileCode, sessionId, operationType });
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode,
          sessionId,
          timestamp: new Date().toISOString(),
          attempt,
          operationType
        }
      });
      
      console.log('Status check response:', data);
      
      if (error) {
        console.error('Error checking payment status:', error);
        return false;
      }
      
      if (data.success) {
        console.log('Payment successful!');
        cleanupStatusCheck();
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          transaction_data: data.data
        }));
        
        // Post a message to parent window for potential listeners
        window.postMessage({
          action: 'payment-status-update',
          status: 'success',
          data: data.data
        }, window.location.origin);
        
        return true;
      } else if (data.failed || data.timeout) {
        console.log('Payment failed or timed out');
        cleanupStatusCheck();
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          error: data.message || 'התשלום נכשל'
        }));
        
        if (data.timeout) {
          toast.error('תהליך התשלום נמשך יותר מדי זמן - נסה שנית');
        } else {
          toast.error(data.message || 'התשלום נכשל');
        }
        
        return false;
      }
      
      setAttempt(prev => prev + 1);
      return false;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }, [lowProfileCode, sessionId, attempt, operationType, setState, cleanupStatusCheck]);
  
  const startStatusCheck = useCallback((
    newLowProfileCode: string, 
    newSessionId: string,
    newOperationType: 'payment' | 'token_only' = 'payment',
    newPlanId: string = ''
  ) => {
    // Clean up any existing interval first
    cleanupStatusCheck();
    
    console.log('Starting payment status check for:', {
      lowProfileCode: newLowProfileCode,
      sessionId: newSessionId,
      operationType: newOperationType,
      planId: newPlanId
    });
    
    // Save the parameters
    setLowProfileCode(newLowProfileCode);
    setSessionId(newSessionId);
    setOperationType(newOperationType);
    setPlanId(newPlanId);
    setAttempt(0);
    
    // Start a new interval
    const id = window.setInterval(checkPaymentStatus, 3000);
    setIntervalId(id);
    
    // Run initial check immediately
    setTimeout(checkPaymentStatus, 500);
  }, [cleanupStatusCheck, checkPaymentStatus]);
  
  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
