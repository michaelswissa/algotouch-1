import { useState, useCallback, useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { supabase } from '@/integrations/supabase/client';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const [statusCheckParams, setStatusCheckParams] = useState<{
    lowProfileCode: string;
    sessionId: string;
    operationType?: string;
    planType?: string;
  } | null>(null);
  const [statusInterval, setStatusInterval] = useState<number | null>(null);
  const [statusCheckAttempts, setStatusCheckAttempts] = useState(0);

  const cleanupStatusCheck = useCallback(() => {
    if (statusInterval) {
      clearInterval(statusInterval);
    }
  }, [statusInterval]);

  const startStatusCheck = useCallback((lowProfileCode: string, sessionId: string, operationType?: string, planType?: string) => {
    console.log('Starting payment status check for:', { lowProfileCode, sessionId, operationType, planType });
    setStatusCheckParams({ lowProfileCode, sessionId, operationType, planType });
    setStatusCheckAttempts(0);
    
    if (statusInterval) {
      clearInterval(statusInterval);
    }
    
    const interval = window.setInterval(() => {
      setStatusCheckAttempts(prev => prev + 1);
    }, 2000);
    
    setStatusInterval(interval);
    
    setTimeout(() => {
      performStatusCheck(lowProfileCode, sessionId, operationType, planType, 1);
    }, 500);
  }, [statusInterval]);

  const performStatusCheck = async (
    lowProfileCode: string, 
    sessionId: string, 
    operationType?: string, 
    planType?: string,
    attempt: number = 0
  ) => {
    console.log(`Checking payment status (attempt ${attempt}):`, { 
      lowProfileCode, 
      sessionId, 
      operationType, 
      planType 
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          action: 'check-status',
          lowProfileCode,
          sessionId,
          planId: planType,
          operationType,
          timestamp: new Date().toISOString(),
          attempt: attempt || statusCheckAttempts
        }
      });
      
      console.log('Status check response:', data);
      
      if (error) {
        console.error('Error checking payment status:', error);
        return;
      }
      
      if (data.success) {
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
        window.postMessage({
          action: 'payment-status-update',
          status: 'success',
          isTokenOnly: operationType === 'token_only'
        }, '*');
        cleanupStatusCheck();
      } else if (data.failed || data.timeout) {
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        cleanupStatusCheck();
      }
    } catch (error) {
      console.error('Error in status check:', error);
    }
  };

  const checkPaymentStatus = useCallback(() => {
    if (!statusCheckParams) {
      console.error('Cannot check status: missing parameters');
      return;
    }
    
    const { lowProfileCode, sessionId, operationType, planType } = statusCheckParams;
    performStatusCheck(lowProfileCode, sessionId, operationType, planType, statusCheckAttempts + 1);
  }, [statusCheckParams, statusCheckAttempts]);

  useEffect(() => {
    if (!statusInterval || !statusCheckParams) return;
    
    const { lowProfileCode, sessionId, operationType, planType } = statusCheckParams;
    
    if (statusCheckAttempts >= 150) {
      console.log('Maximum status check attempts reached, stopping checks');
      cleanupStatusCheck();
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      return;
    }
    
    if (statusCheckAttempts > 0 && statusCheckAttempts % (statusCheckAttempts < 10 ? 2 : (statusCheckAttempts < 30 ? 5 : 10)) === 0) {
      performStatusCheck(lowProfileCode, sessionId, operationType, planType, statusCheckAttempts);
    }
  }, [statusCheckAttempts, statusCheckParams, statusInterval, setState, cleanupStatusCheck]);

  useEffect(() => {
    return cleanupStatusCheck;
  }, [cleanupStatusCheck]);

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
