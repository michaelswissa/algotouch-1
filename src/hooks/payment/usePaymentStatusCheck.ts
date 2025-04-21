
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
    maxAttempts: 36, // Increased to accommodate longer processing times
    checkInterval: 5000 // Start with more frequent checks
  });
  
  // Track if payment has been verified as successful
  const paymentVerifiedRef = useRef(false);
  
  // Track time when status check started (for timeout calculation)
  const startTimeRef = useRef<number | null>(null);
  
  // Maximum allowed time for processing in milliseconds (3 minutes)
  const MAX_PROCESSING_TIME = 3 * 60 * 1000;
  
  // Track pending checks to prevent race conditions
  const pendingCheckRef = useRef(false);

  // Clear interval on unmount or when no longer needed
  const clearStatusCheckInterval = useCallback(() => {
    if (statusCheckData.intervalId) {
      clearInterval(statusCheckData.intervalId);
    }
  }, [statusCheckData.intervalId]);

  // Define checkPaymentStatus function with improved error handling
  const checkPaymentStatus = useCallback(async (lowProfileCode: string, sessionId: string) => {
    // Don't check if payment was already verified or if there's a check in progress
    if (paymentVerifiedRef.current || pendingCheckRef.current) {
      return;
    }
    
    // Set pending flag to prevent concurrent checks
    pendingCheckRef.current = true;
    
    console.log('Checking payment status:', { 
      lowProfileCode, 
      sessionId, 
      timestamp: new Date().toISOString(),
      attempt: statusCheckData.attempts
    });
    
    try {
      // Call the cardcom-status Edge Function with cache-busting
      const timestamp = Date.now();
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { 
          lowProfileCode, 
          sessionId,
          terminalNumber: "160138",
          timestamp, // Add timestamp to prevent caching issues
          attempt: statusCheckData.attempts // Add attempt number for logging
        }
      });

      console.log('Payment status check response:', data);

      if (error) {
        console.error('Error checking payment status:', error);
        pendingCheckRef.current = false;
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
      } else if (data?.processing) {
        console.log('Payment is still processing', { attempt: statusCheckData.attempts });
      }
      // If neither success nor failure, continue checking
    } catch (error) {
      console.error('Exception in payment status check:', error);
      // Continue checking despite errors - the interval will stop after max attempts
    } finally {
      // Clear pending flag
      pendingCheckRef.current = false;
    }
  }, [clearStatusCheckInterval, setState, statusCheckData.attempts]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearStatusCheckInterval();
    };
  }, [clearStatusCheckInterval]);

  // Start status checking with adaptive polling
  const startStatusCheck = useCallback((lowProfileCode: string, sessionId: string) => {
    // Clean up any existing interval
    clearStatusCheckInterval();
    
    // Reset verification flag
    paymentVerifiedRef.current = false;
    
    // Reset pending check flag
    pendingCheckRef.current = false;
    
    // Set start time for timeout tracking
    startTimeRef.current = Date.now();

    console.log('Starting payment status check for:', { lowProfileCode, sessionId });
    
    // Initial check immediately
    checkPaymentStatus(lowProfileCode, sessionId);
    
    // Set up adaptive polling with increasingly longer intervals
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
      
      setStatusCheckData(prev => {
        const newAttempts = prev.attempts + 1;
        
        // Stop if maximum attempts reached
        if (newAttempts >= prev.maxAttempts) {
          clearInterval(intervalId);
          console.log('Stopped payment status check after maximum attempts');
          setState(prev => ({ 
            ...prev, 
            paymentStatus: PaymentStatus.FAILED 
          }));
          toast.error('זמן בדיקת התשלום הסתיים, אנא בדוק אם החיוב בוצע בפועל או נסה שנית');
          return { ...prev, attempts: newAttempts, intervalId: undefined };
        }
        
        // Implement adaptive polling intervals
        let newInterval = prev.checkInterval;
        
        if (newAttempts === 6) { // After ~30 seconds (6 attempts × 5s)
          newInterval = 10000; // Check every 10 seconds
        } else if (newAttempts === 12) { // After ~1.5 minutes
          newInterval = 15000; // Check every 15 seconds
        }
        
        // If the interval has changed, need to recreate it
        if (newInterval !== prev.checkInterval) {
          clearInterval(intervalId);
          const newIntervalId = setInterval(() => {
            checkPaymentStatus(lowProfileCode, sessionId);
          }, newInterval);
          
          return { 
            ...prev, 
            attempts: newAttempts,
            checkInterval: newInterval,
            intervalId: newIntervalId
          };
        }
        
        return { ...prev, attempts: newAttempts };
      });
      
      // Check payment status
      checkPaymentStatus(lowProfileCode, sessionId);
    }, statusCheckData.checkInterval);

    setStatusCheckData({
      intervalId,
      lpCode: lowProfileCode,
      sessionId,
      attempts: 0,
      maxAttempts: 36, // Increased for longer polling
      checkInterval: 5000 // Start with 5 seconds
    });
  }, [clearStatusCheckInterval, checkPaymentStatus, setState, statusCheckData.checkInterval]);

  const cleanupStatusCheck = useCallback(() => {
    clearStatusCheckInterval();
    setStatusCheckData(prev => ({ 
      ...prev, 
      intervalId: undefined,
      attempts: 0
    }));
    
    // Reset verification flag
    paymentVerifiedRef.current = false;
    
    // Reset pending check flag
    pendingCheckRef.current = false;
    
    // Reset start time
    startTimeRef.current = null;
  }, [clearStatusCheckInterval]);

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
