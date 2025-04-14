
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
  }>({
    attempts: 0
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
    
    // Set up a new interval to check payment status
    const intervalId = setInterval(() => {
      checkPaymentStatus(lowProfileCode, sessionId);
      
      // Update attempts count
      setStatusCheckData(prev => {
        const newAttempts = prev.attempts + 1;
        
        // After 30 attempts (5 minutes), stop checking
        if (newAttempts >= 30) {
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
    }, 10000); // Check every 10 seconds

    setStatusCheckData({
      intervalId,
      lpCode: lowProfileCode,
      sessionId,
      attempts: 0
    });
  };

  const checkPaymentStatus = async (lowProfileCode: string, sessionId: string) => {
    console.log('Checking payment status:', { lowProfileCode, sessionId });
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode, sessionId }
      });

      console.log('Payment status check response:', data);

      if (error) {
        console.error('Error checking payment status:', error);
        
        // Handle authentication errors specially
        if (error.message && error.message.includes('401')) {
          console.log('Authentication error, retrying without authentication');
          // Let it continue, don't set failed state here
          // The Edge Function will be changed to not require authentication
        }
        
        return;
      }

      if (data?.success) {
        console.log('Payment successful!');
        
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
    } catch (error) {
      console.error('Error in payment status check:', error);
    }
  };

  const cleanupStatusCheck = () => {
    if (statusCheckData.intervalId) {
      clearInterval(statusCheckData.intervalId);
      setStatusCheckData(prev => ({ ...prev, intervalId: undefined }));
    }
  };

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
