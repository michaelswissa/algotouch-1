
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
    operationType?: 'payment' | 'token_only';
    planType?: string;
  }>({
    attempts: 0,
    maxAttempts: 36, // Increased to accommodate longer processing times
    checkInterval: 5000, // Start with more frequent checks
    operationType: 'payment'
  });
  
  // Track if payment has been verified as successful
  const paymentVerifiedRef = useRef(false);
  
  // Track time when status check started (for timeout calculation)
  const startTimeRef = useRef<number | null>(null);
  
  // Maximum allowed time for processing in milliseconds
  // Different timeouts for different operation types
  const MAX_PROCESSING_TIME = {
    payment: 3 * 60 * 1000, // 3 minutes for regular payments
    token_only: 45 * 1000    // 45 seconds for token creation
  };
  
  // Track pending checks to prevent race conditions
  const pendingCheckRef = useRef(false);

  // Clear interval on unmount or when no longer needed
  const clearStatusCheckInterval = useCallback(() => {
    if (statusCheckData.intervalId) {
      clearInterval(statusCheckData.intervalId);
    }
  }, [statusCheckData.intervalId]);

  // Define checkPaymentStatus function with improved error handling
  const checkPaymentStatus = useCallback(async (
    lowProfileCode: string, 
    sessionId: string, 
    operationType: 'payment' | 'token_only' = 'payment',
    planType?: string
  ) => {
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
      attempt: statusCheckData.attempts,
      operationType,
      planType
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
          attempt: statusCheckData.attempts, // Add attempt number for logging
          operationType, // Add operation type for better status detection
          planType      // Add plan type for operation-specific handling
        }
      });

      console.log('Payment status check response:', data);

      if (error) {
        console.error('Error checking payment status:', error);
        pendingCheckRef.current = false;
        return;
      }

      // Improved token creation success detection
      if (data?.success && data.data?.isTokenOperation) {
        console.log('Token creation successful:', data);
        paymentVerifiedRef.current = true;
        clearStatusCheckInterval();
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          transactionId: data.data?.token || 'unknown'
        }));
        toast.success('אסימון נוצר בהצלחה, המנוי הופעל!');
        try {
          await supabase.from('payment_sessions').update({
            status: 'completed',
            transaction_id: data.data?.token
          })
          .eq('id', sessionId);
        } catch (dbError) { /* ignore */ }
        return;
      }
      
      // Handle token creation failure
      if (data?.failed && data.data?.isTokenOperation) {
        console.error('Token creation failed:', data);
        paymentVerifiedRef.current = true;
        clearStatusCheckInterval();
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED 
        }));
        toast.error(data.message || 'יצירת אסימון נכשלה');
        return;
      }
      
      // Regular payment success
      if (data?.success) {
        console.log('Payment successful:', data);
        paymentVerifiedRef.current = true;
        clearStatusCheckInterval();
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          transactionId: data.data?.transactionId || 'unknown'
        }));
        toast.success('התשלום בוצע בהצלחה!');
        try {
          await supabase.from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: data.data?.transactionId
            })
            .eq('id', sessionId);
        } catch (dbError) {}
      } else if (data?.failed) {
        console.error('Payment failed:', data);
        paymentVerifiedRef.current = true;
        clearStatusCheckInterval();
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED
        }));
        toast.error(data.message || 'התשלום נכשל');
      } else if (data?.processing) {
        console.log('Payment is still processing', { 
          attempt: statusCheckData.attempts,
          operationType
        });
      }
    } catch (error) {
      console.error('Exception in payment status check:', error);
    } finally {
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
  const startStatusCheck = useCallback((
    lowProfileCode: string, 
    sessionId: string, 
    operationType: 'payment' | 'token_only' = 'payment',
    planType?: string
  ) => {
    // Clean up any existing interval
    clearStatusCheckInterval();
    
    // Reset verification flag
    paymentVerifiedRef.current = false;
    
    // Reset pending check flag
    pendingCheckRef.current = false;
    
    // Set start time for timeout tracking
    startTimeRef.current = Date.now();

    console.log('Starting payment status check for:', { 
      lowProfileCode, 
      sessionId,
      operationType,
      planType
    });
    
    // Initial check immediately
    checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
    
    // Calculate appropriate initial check interval based on operation type
    // For token operations, check more frequently initially
    const initialCheckInterval = operationType === 'token_only' ? 3000 : 5000;
    
    // Set up adaptive polling with increasingly longer intervals
    const intervalId = setInterval(() => {
      // Get maximum processing time based on operation type
      const maxTime = operationType === 'token_only' 
        ? MAX_PROCESSING_TIME.token_only 
        : MAX_PROCESSING_TIME.payment;
      
      // Check if maximum processing time has been exceeded
      if (startTimeRef.current && (Date.now() - startTimeRef.current > maxTime)) {
        clearInterval(intervalId);
        console.log(`Payment processing timeout exceeded for ${operationType}`);
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED 
        }));
        toast.error(operationType === 'token_only' 
          ? 'חריגת זמן ביצירת אסימון, אנא נסה שנית' 
          : 'חריגת זמן בתהליך התשלום, אנא נסה שנית');
        return;
      }
      
      // Don't check again if payment was already verified
      if (paymentVerifiedRef.current) {
        clearInterval(intervalId);
        return;
      }
      
      setStatusCheckData(prev => {
        const newAttempts = prev.attempts + 1;
        
        // Calculate max attempts based on operation type
        const operationMaxAttempts = prev.operationType === 'token_only' ? 15 : 36;
        
        // Stop if maximum attempts reached
        if (newAttempts >= operationMaxAttempts) {
          clearInterval(intervalId);
          console.log(`Stopped ${prev.operationType} status check after maximum attempts`);
          setState(prev => ({ 
            ...prev, 
            paymentStatus: PaymentStatus.FAILED 
          }));
          toast.error(prev.operationType === 'token_only'
            ? 'זמן יצירת האסימון הסתיים, אנא נסה שנית'
            : 'זמן בדיקת התשלום הסתיים, אנא בדוק אם החיוב בוצע בפועל או נסה שנית');
          return { ...prev, attempts: newAttempts, intervalId: undefined };
        }
        
        // Implement adaptive polling intervals based on operation type
        let newInterval = prev.checkInterval;
        
        if (prev.operationType === 'token_only') {
          // Faster interval adjustments for token operations
          if (newAttempts === 3) {
            newInterval = 5000;  // 5 seconds
          } else if (newAttempts === 6) {
            newInterval = 7000;  // 7 seconds
          }
        } else {
          // Regular payment operation intervals
          if (newAttempts === 6) { // After ~30 seconds (6 attempts × 5s)
            newInterval = 10000; // Check every 10 seconds
          } else if (newAttempts === 12) { // After ~1.5 minutes
            newInterval = 15000; // Check every 15 seconds
          }
        }
        
        // If the interval has changed, need to recreate it
        if (newInterval !== prev.checkInterval) {
          clearInterval(intervalId);
          const newIntervalId = setInterval(() => {
            checkPaymentStatus(lowProfileCode, sessionId, prev.operationType, prev.planType);
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
      checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
    }, initialCheckInterval);

    setStatusCheckData({
      intervalId,
      lpCode: lowProfileCode,
      sessionId,
      attempts: 0,
      maxAttempts: operationType === 'token_only' ? 15 : 36, // Fewer attempts for token operations
      checkInterval: initialCheckInterval,
      operationType,
      planType
    });
  }, [clearStatusCheckInterval, checkPaymentStatus, setState]);

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
