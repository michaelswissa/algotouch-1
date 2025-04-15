
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const [statusCheckData, setStatusCheckData] = useState<{
    intervalId?: NodeJS.Timeout;
    lpCode?: string;
    sessionId?: string;
    attempts: number;
    maxAttempts: number;
    checkInterval: number;
  }>({
    attempts: 0,
    maxAttempts: 30, // 5 minutes total with 10-second intervals
    checkInterval: 10000 // 10 seconds
  });

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckData.intervalId) {
        clearInterval(statusCheckData.intervalId);
      }
    };
  }, [statusCheckData.intervalId]);

  const startStatusCheck = (lowProfileCode: string, sessionId: string) => {
    // Clean up any existing interval
    if (statusCheckData.intervalId) {
      clearInterval(statusCheckData.intervalId);
    }

    console.log('Starting payment status check for:', { lowProfileCode, sessionId });
    
    // Initial check immediately
    setTimeout(() => {
      checkPaymentStatus(lowProfileCode, sessionId);
    }, 1000);
    
    // Set up a new interval to check payment status
    const intervalId = setInterval(() => {
      checkPaymentStatus(lowProfileCode, sessionId);
      
      // Update attempts count
      setStatusCheckData(prev => {
        const newAttempts = prev.attempts + 1;
        
        // After max attempts, stop checking
        if (newAttempts >= prev.maxAttempts) {
          clearInterval(intervalId);
          console.log('Stopped payment status check after maximum attempts');
          setState(prev => ({ 
            ...prev, 
            paymentStatus: PaymentStatus.FAILED 
          }));
          toast.error('זמן בדיקת התשלום הסתיים, אנא נסה שוב');
          return { ...prev, intervalId: undefined };
        }
        
        return { ...prev, attempts: newAttempts };
      });
    }, statusCheckData.checkInterval);

    setStatusCheckData({
      intervalId,
      lpCode: lowProfileCode,
      sessionId,
      attempts: 0,
      maxAttempts: 30,
      checkInterval: 10000
    });
  };

  const checkPaymentStatus = async (lowProfileCode: string, sessionId: string) => {
    console.log('Checking payment status:', { lowProfileCode, sessionId, attempt: statusCheckData.attempts + 1 });
    
    try {
      // Call the cardcom-status Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode, sessionId }
      });

      console.log('Payment status check response:', data);

      if (error) {
        console.error('Error checking payment status:', error);
        
        // For now, we continue checking even if there's an error
        // The server returns 200 status even for errors now
        return;
      }

      if (data?.success) {
        console.log('Payment successful!', data);
        
        // Clean up the interval
        if (statusCheckData.intervalId) {
          clearInterval(statusCheckData.intervalId);
        }
        
        // Update state with success
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          transactionId: data.data?.transactionId || 'unknown'
        }));
        
        toast.success('התשלום בוצע בהצלחה!');
        
        // Also update the database if needed as a fallback
        try {
          await supabase.from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: data.data?.transactionId
            })
            .eq('id', sessionId);
        } catch (dbError) {
          console.warn('Failed to update payment session in DB:', dbError);
          // Not critical, the webhook should handle this
        }
      } else if (data?.failed) {
        console.log('Payment failed:', data.message);
        
        // Clean up the interval
        if (statusCheckData.intervalId) {
          clearInterval(statusCheckData.intervalId);
        }
        
        // Update state with failure
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED 
        }));
        
        toast.error(data.message || 'התשלום נכשל');
      }
      // If neither success nor failure, continue checking
    } catch (error) {
      console.error('Exception in payment status check:', error);
      // Continue checking despite errors - the interval will stop after max attempts
    }
  };

  const cleanupStatusCheck = () => {
    if (statusCheckData.intervalId) {
      clearInterval(statusCheckData.intervalId);
      setStatusCheckData(prev => ({ 
        ...prev, 
        intervalId: undefined,
        attempts: 0
      }));
    }
  };

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
