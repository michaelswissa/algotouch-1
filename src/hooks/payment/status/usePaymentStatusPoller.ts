
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusPollerProps {
  setState: (updater: any) => void;
  cleanupStatusCheck?: () => void;
  isMounted: React.MutableRefObject<boolean>;
  updateDiagnostics: (error?: string) => void;
}

export const usePaymentStatusPoller = ({
  setState,
  cleanupStatusCheck,
  isMounted,
  updateDiagnostics
}: UsePaymentStatusPollerProps) => {
  const [attempt, setAttempt] = useState(0);

  const checkPaymentStatus = useCallback(async (
    lowProfileCode: string,
    sessionId: string,
    operationType: 'payment' | 'token_only'
  ) => {
    if (!lowProfileCode || !sessionId) {
      console.error('Missing required parameters for payment status check');
      return false;
    }
    
    // Update diagnostic data
    updateDiagnostics();
    
    console.log(`Checking payment status (attempt ${attempt}):`, { 
      lowProfileCode, 
      sessionId, 
      operationType
    });
    
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
        updateDiagnostics(error.message);
        return false;
      }
      
      if (data.success) {
        console.log('Payment successful!');
        if (isMounted.current && cleanupStatusCheck) {
          cleanupStatusCheck();
          setState(prev => ({ 
            ...prev, 
            paymentStatus: PaymentStatus.SUCCESS,
            transaction_data: data.data
          }));
          
          window.postMessage({
            action: 'payment-status-update',
            status: 'success',
            data: data.data
          }, window.location.origin);
        }
        return true;
      } 
      else if (data.failed || data.timeout) {
        console.log('Payment failed or timed out:', data);
        if (isMounted.current && cleanupStatusCheck) {
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
        }
        return false;
      }
      
      if (isMounted.current) {
        setAttempt(prev => prev + 1);
      }
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error checking payment status:', errorMessage);
      updateDiagnostics(errorMessage);
      return false;
    }
  }, [attempt, cleanupStatusCheck, setState, isMounted, updateDiagnostics]);

  return {
    attempt,
    setAttempt,
    checkPaymentStatus
  };
};
