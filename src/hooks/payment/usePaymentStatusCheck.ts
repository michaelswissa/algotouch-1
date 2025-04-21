
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
    retries: number;
    consecutiveErrors: number;
  }>({
    attempts: 0,
    maxAttempts: 30, // Maximum attempts before giving up
    checkInterval: 2500, // Initial interval (ms)
    operationType: 'payment',
    retries: 0,
    consecutiveErrors: 0
  });
  
  // Track if payment has been verified
  const paymentVerifiedRef = useRef(false);
  
  // Track time when status check started
  const startTimeRef = useRef<number | null>(null);
  
  // Maximum processing time in milliseconds before considering it failed
  const MAX_PROCESSING_TIME = {
    payment: 3 * 60 * 1000, // 3 minutes for regular payments
    token_only: 2 * 60 * 1000 // 2 minutes for token creation
  };
  
  // Track pending checks to prevent race conditions
  const pendingCheckRef = useRef(false);
  
  // Track last check time to prevent too frequent calls
  const lastCheckTimeRef = useRef<number>(0);
  
  // Minimum time between checks
  const MIN_CHECK_INTERVAL = 1000; // 1 second

  // Clear interval on unmount or when finished
  const clearStatusCheckInterval = useCallback(() => {
    if (statusCheckData.intervalId) {
      console.log('Clearing status check interval');
      clearInterval(statusCheckData.intervalId);
    }
  }, [statusCheckData.intervalId]);

  const checkPaymentStatus = useCallback(async (
    lowProfileCode: string, 
    sessionId: string, 
    operationType: 'payment' | 'token_only' = 'payment',
    planType?: string
  ) => {
    // Don't check if payment was already verified
    if (paymentVerifiedRef.current) {
      console.log('Payment already verified, skipping status check');
      return;
    }
    
    // Prevent too frequent checks
    const now = Date.now();
    if (now - lastCheckTimeRef.current < MIN_CHECK_INTERVAL) {
      console.log('Check requested too soon after previous check, skipping');
      return;
    }
    
    // Don't check if there's a check in progress
    if (pendingCheckRef.current) {
      console.log('Status check already in progress, skipping');
      return;
    }
    
    // Set flags to prevent concurrent checks
    pendingCheckRef.current = true;
    lastCheckTimeRef.current = now;
    
    console.log('Checking payment status:', { 
      lowProfileCode, 
      sessionId, 
      timestamp: new Date().toISOString(),
      attempt: statusCheckData.attempts + 1,
      operationType,
      planType
    });
    
    try {
      // Call the cardcom-status Edge Function with detailed params
      const timestamp = Date.now();
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { 
          lowProfileCode, 
          sessionId,
          terminalNumber: "160138", // CardCom terminal number
          timestamp, // Add timestamp to prevent caching
          attempt: statusCheckData.attempts + 1, 
          operationType, 
          planType,
          forceRefresh: statusCheckData.attempts > 2, // Force refresh after a few attempts
          checkType: statusCheckData.consecutiveErrors > 1 ? 'aggressive' : 'normal'
        }
      });

      console.log('Payment status check response:', data);

      if (error) {
        console.error('Error checking payment status:', error);
        
        // Increment error counters
        setStatusCheckData(prev => ({
          ...prev,
          retries: prev.retries + 1,
          consecutiveErrors: prev.consecutiveErrors + 1
        }));
        
        // Show error after multiple failures
        if (statusCheckData.retries > 2) {
          toast.error('שגיאת תקשורת בבדיקת סטטוס העסקה');
        }
        
        pendingCheckRef.current = false;
        return;
      }

      // Reset consecutive errors on successful API call
      setStatusCheckData(prev => ({
        ...prev,
        retries: 0,
        consecutiveErrors: 0
      }));

      // Token operation success handling with improved detection
      const isTokenOperation = operationType === 'token_only' || planType === 'monthly';
      
      if (data?.success && (data.data?.isTokenOperation || isTokenOperation)) {
        console.log('Token creation successful:', data);
        paymentVerifiedRef.current = true; // Prevent further checks
        clearStatusCheckInterval();
        
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          transactionId: data.data?.token || data.data?.transactionId || 'unknown'
        }));
        
        toast.success('אסימון נוצר בהצלחה, המנוי הופעל!');
        
        try {
          if (sessionId && !sessionId.startsWith('temp-')) {
            await supabase.from('payment_sessions').update({
              status: 'completed',
              transaction_id: data.data?.token || data.data?.transactionId
            })
            .eq('id', sessionId);
            
            console.log('Updated session with token completion data');
          }
        } catch (dbError) {
          console.error('Error updating session after token creation:', dbError);
        }
        return;
      }
      
      // Handle token creation failure
      if (data?.failed && (data.data?.isTokenOperation || isTokenOperation)) {
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
      
      // Handle token creation timeout
      if ((data?.timeout && (data.data?.isTokenOperation || isTokenOperation)) ||
          (isTokenOperation && statusCheckData.attempts >= 20)) {
        console.error('Token creation timed out:', data);
        paymentVerifiedRef.current = true;
        clearStatusCheckInterval();
        
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED 
        }));
        
        toast.error('חריגת זמן ביצירת אסימון, אנא נסה שנית');
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
          if (sessionId && !sessionId.startsWith('temp-')) {
            await supabase.from('payment_sessions')
              .update({
                status: 'completed',
                transaction_id: data.data?.transactionId
              })
              .eq('id', sessionId);
            
            console.log('Updated session with payment completion data');
          }
        } catch (dbError) {
          console.error('Error updating session after payment:', dbError);
        }
        return;
      } else if (data?.failed) {
        console.error('Payment failed:', data);
        paymentVerifiedRef.current = true;
        clearStatusCheckInterval();
        
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED
        }));
        
        toast.error(data.message || 'התשלום נכשל');
        return;
      } else if (data?.processing) {
        console.log('Payment is still processing', { 
          attempt: statusCheckData.attempts,
          operationType
        });
        
        // Show progress toast periodically
        if (statusCheckData.attempts === 4) {
          toast.info(isTokenOperation ? 
            'מעבד את יצירת האסימון, אנא המתן...' : 
            'מעבד את התשלום, אנא המתן...');
        }
      }
    } catch (error) {
      console.error('Exception in payment status check:', error);
      
      // Increment retries for any unexpected errors
      setStatusCheckData(prev => ({
        ...prev,
        retries: prev.retries + 1,
        consecutiveErrors: prev.consecutiveErrors + 1
      }));
    } finally {
      pendingCheckRef.current = false;
      
      // Update attempt count
      setStatusCheckData(prev => ({
        ...prev,
        attempts: prev.attempts + 1
      }));
    }
  }, [clearStatusCheckInterval, setState, statusCheckData.attempts, statusCheckData.retries, statusCheckData.consecutiveErrors]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearStatusCheckInterval();
    };
  }, [clearStatusCheckInterval]);

  // Start payment status checking
  const startStatusCheck = useCallback((
    lowProfileCode: string, 
    sessionId: string, 
    operationType: 'payment' | 'token_only' = 'payment',
    planType?: string
  ) => {
    // Clean up any existing interval
    clearStatusCheckInterval();
    
    // Reset all state
    paymentVerifiedRef.current = false;
    pendingCheckRef.current = false;
    lastCheckTimeRef.current = 0;
    startTimeRef.current = Date.now();

    console.log('Starting payment status check:', { 
      lowProfileCode, 
      sessionId,
      operationType,
      planType
    });
    
    // Initial check immediately
    checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
    
    // Determine initial check interval based on operation type
    const initialCheckInterval = operationType === 'token_only' ? 3000 : 2500;
    
    // Set up adaptive polling
    const intervalId = setInterval(() => {
      // Check for timeout based on operation type
      const maxTime = operationType === 'token_only' 
        ? MAX_PROCESSING_TIME.token_only 
        : MAX_PROCESSING_TIME.payment;
      
      // Check if maximum processing time exceeded
      if (startTimeRef.current && (Date.now() - startTimeRef.current > maxTime)) {
        clearInterval(intervalId);
        console.log(`Payment processing timeout after ${Math.round((Date.now() - startTimeRef.current)/1000)} seconds`);
        
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED 
        }));
        
        toast.error(operationType === 'token_only' 
          ? 'חריגת זמן ביצירת אסימון, אנא נסה שנית' 
          : 'חריגת זמן בתהליך התשלום, אנא נסה שנית');
        return;
      }
      
      // Don't check if already verified
      if (paymentVerifiedRef.current) {
        clearInterval(intervalId);
        return;
      }
      
      setStatusCheckData(prev => {
        const newAttempts = prev.attempts + 1;
        
        // Calculate max attempts based on operation
        const operationMaxAttempts = prev.operationType === 'token_only' ? 25 : 20;
        
        // Stop if maximum attempts reached
        if (newAttempts >= operationMaxAttempts) {
          clearInterval(intervalId);
          console.log(`Stopped checking status after ${operationMaxAttempts} attempts`);
          
          // Only set failed if not already verified
          if (!paymentVerifiedRef.current) {
            setState(prev => ({ 
              ...prev, 
              paymentStatus: PaymentStatus.FAILED 
            }));
            
            toast.error(prev.operationType === 'token_only'
              ? 'לא התקבל אישור ליצירת האסימון, אנא נסה שנית'
              : 'לא התקבל אישור לביצוע התשלום, אנא בדוק אם החיוב בוצע');
          }
          
          return { ...prev, attempts: newAttempts, intervalId: undefined };
        }
        
        // Adaptive polling intervals
        let newInterval = prev.checkInterval;
        
        if (prev.operationType === 'token_only') {
          // Intervals for token operations
          if (newAttempts === 4) newInterval = 3000;
          else if (newAttempts === 8) newInterval = 4000;
          else if (newAttempts === 12) {
            newInterval = 5000;
            toast.info('ממשיך לעקוב אחר תהליך יצירת האסימון...');
          } 
          else if (newAttempts === 16) newInterval = 6000;
        } else {
          // Intervals for payment operations
          if (newAttempts === 4) newInterval = 3000;
          else if (newAttempts === 8) {
            newInterval = 4000;
            toast.info('ממשיך לעקוב אחר תהליך התשלום...');
          }
          else if (newAttempts === 12) newInterval = 5000;
        }
        
        // If interval changed, recreate it
        if (newInterval !== prev.checkInterval) {
          clearInterval(intervalId);
          const newIntervalId = setInterval(() => {
            if (!paymentVerifiedRef.current && !pendingCheckRef.current) {
              checkPaymentStatus(lowProfileCode, sessionId, prev.operationType, prev.planType);
            }
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
      
      // Check status if not in progress and not verified
      if (!paymentVerifiedRef.current && !pendingCheckRef.current) {
        checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
      }
    }, initialCheckInterval);

    // Store check data
    setStatusCheckData({
      intervalId,
      lpCode: lowProfileCode,
      sessionId,
      attempts: 0,
      maxAttempts: operationType === 'token_only' ? 25 : 20,
      checkInterval: initialCheckInterval,
      operationType,
      planType,
      retries: 0,
      consecutiveErrors: 0
    });
    
    // Extra checks with delays to catch quick responses
    setTimeout(() => {
      if (!paymentVerifiedRef.current && !pendingCheckRef.current) {
        checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
      }
    }, 1000);
    
    setTimeout(() => {
      if (!paymentVerifiedRef.current && !pendingCheckRef.current) {
        checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
      }
    }, 5000);
  }, [clearStatusCheckInterval, checkPaymentStatus, setState]);

  // Clean up all state
  const cleanupStatusCheck = useCallback(() => {
    clearStatusCheckInterval();
    setStatusCheckData(prev => ({ 
      ...prev, 
      intervalId: undefined,
      attempts: 0,
      retries: 0,
      consecutiveErrors: 0
    }));
    
    paymentVerifiedRef.current = false;
    pendingCheckRef.current = false;
    startTimeRef.current = null;
    lastCheckTimeRef.current = 0;
    
    console.log('Payment status check cleaned up');
  }, [clearStatusCheckInterval]);

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
