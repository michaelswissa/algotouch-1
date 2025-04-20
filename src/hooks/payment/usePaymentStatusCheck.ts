
import { useState, useEffect, useRef, useCallback } from 'react';
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
    maxAttempts: 30, // Reduced from 60 to 30 (5 minutes at 10 second intervals)
    checkInterval: 10000 // 10 seconds between checks
  });
  
  // Track if payment has been verified as successful
  const paymentVerifiedRef = useRef(false);
  
  // Track time when status check started (for timeout calculation)
  const startTimeRef = useRef<number | null>(null);
  
  // Maximum allowed time for processing in milliseconds (3 minutes)
  const MAX_PROCESSING_TIME = 3 * 60 * 1000;

  // Clear interval on unmount or when no longer needed
  const clearStatusCheckInterval = useCallback(() => {
    if (statusCheckData.intervalId) {
      clearInterval(statusCheckData.intervalId);
    }
  }, [statusCheckData.intervalId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearStatusCheckInterval();
    };
  }, [clearStatusCheckInterval]);

  const startStatusCheck = useCallback((lowProfileCode: string, sessionId: string) => {
    // Clean up any existing interval
    clearStatusCheckInterval();
    
    // Reset verification flag
    paymentVerifiedRef.current = false;
    
    // Set start time for timeout tracking
    startTimeRef.current = Date.now();

    console.log('Starting payment status check for:', { lowProfileCode, sessionId });
    
    // Initial check immediately
    checkPaymentStatus(lowProfileCode, sessionId);
    
    // Set up adaptive polling with increasingly longer intervals
    let currentInterval = statusCheckData.checkInterval;
    
    const intervalId = setInterval(() => {
      // Check if maximum processing time has been exceeded
      if (startTimeRef.current && (Date.now() - startTimeRef.current > MAX_PROCESSING_TIME)) {
        clearInterval(intervalId);
        console.log('Payment processing timeout exceeded');
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED 
        }));
        toast.error('חריגת זמן בתהליך התשלום, אנא נסה שנית');
        return;
      }
      
      // Don't check again if payment was already verified
      if (paymentVerifiedRef.current) {
        clearInterval(intervalId);
        return;
      }
      
      checkPaymentStatus(lowProfileCode, sessionId);
      
      setStatusCheckData(prev => {
        const newAttempts = prev.attempts + 1;
        
        if (newAttempts >= prev.maxAttempts) {
          clearInterval(intervalId);
          console.log('Stopped payment status check after maximum attempts');
          setState(prev => ({ 
            ...prev, 
            paymentStatus: PaymentStatus.FAILED 
          }));
          toast.error('זמן בדיקת התשלום הסתיים, אנא נסה שנית');
          return { ...prev, intervalId: undefined };
        }
        
        // Implement adaptive polling - increase interval after certain thresholds
        if (newAttempts === 5) {
          currentInterval = 15000; // After 5 attempts, check every 15 seconds
        } else if (newAttempts === 10) {
          currentInterval = 20000; // After 10 attempts, check every 20 seconds
        }
        
        return { ...prev, attempts: newAttempts, lpCode: lowProfileCode, sessionId };
      });
    }, currentInterval);

    setStatusCheckData({
      intervalId,
      lpCode: lowProfileCode,
      sessionId,
      attempts: 0,
      maxAttempts: 30,
      checkInterval: 10000
    });
  }, [clearStatusCheckInterval, checkPaymentStatus, setState, statusCheckData.checkInterval]);

  const checkPaymentStatus = useCallback(async (lowProfileCode: string, sessionId: string) => {
    // Don't check if payment was already verified
    if (paymentVerifiedRef.current) {
      return;
    }
    
    console.log('Checking payment status:', { lowProfileCode, sessionId, timestamp: new Date().toISOString() });
    
    try {
      // Call the cardcom-status Edge Function with cache-busting
      const timestamp = Date.now();
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { 
          lowProfileCode, 
          sessionId,
          terminalNumber: "160138",
          timestamp // Add timestamp to prevent caching issues
        }
      });

      console.log('Payment status check response:', data);

      if (error) {
        console.error('Error checking payment status:', error);
        return;
      }

      if (data?.success) {
        console.log('Payment successful!', data);
        
        // Mark payment as verified to prevent further checks
        paymentVerifiedRef.current = true;
        
        // Clean up the interval
        clearStatusCheckInterval();
        
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
        
        // Mark payment as verified to prevent further checks
        paymentVerifiedRef.current = true;
        
        // Clean up the interval
        clearStatusCheckInterval();
        
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
  }, [clearStatusCheckInterval, setState]);

  const cleanupStatusCheck = useCallback(() => {
    clearStatusCheckInterval();
    setStatusCheckData(prev => ({ 
      ...prev, 
      intervalId: undefined,
      attempts: 0
    }));
    
    // Reset verification flag
    paymentVerifiedRef.current = false;
    
    // Reset start time
    startTimeRef.current = null;
  }, [clearStatusCheckInterval]);

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
