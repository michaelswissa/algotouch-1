
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
    retries: number; // Track retries for network errors
    consecutiveErrors: number; // Track consecutive error responses
  }>({
    attempts: 0,
    maxAttempts: 40, // Increased to handle longer processing times
    checkInterval: 3000, // More frequent checks initially
    operationType: 'payment',
    retries: 0,
    consecutiveErrors: 0
  });
  
  // Track if payment has been verified as successful
  const paymentVerifiedRef = useRef(false);
  
  // Track time when status check started (for timeout calculation)
  const startTimeRef = useRef<number | null>(null);
  
  // Maximum allowed time for processing in milliseconds
  const MAX_PROCESSING_TIME = {
    payment: 4 * 60 * 1000, // 4 minutes for regular payments
    token_only: 2 * 60 * 1000 // 2 minutes for token creation (increased from previous)
  };
  
  // Track pending checks to prevent race conditions
  const pendingCheckRef = useRef(false);
  
  // Track last check time to prevent too frequent calls
  const lastCheckTimeRef = useRef<number>(0);
  
  // Minimum time between checks to avoid overwhelming the API
  const MIN_CHECK_INTERVAL = 1000; // 1 second

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
    
    // Set pending flag to prevent concurrent checks
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
      // Call the cardcom-status Edge Function with improved params
      const timestamp = Date.now();
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { 
          lowProfileCode, 
          sessionId,
          terminalNumber: "160138", // CardCom terminal number
          timestamp, // Add timestamp to prevent caching issues
          attempt: statusCheckData.attempts + 1, 
          operationType, 
          planType,
          forceRefresh: statusCheckData.attempts > 3, // Force refresh after a few attempts
          checkType: statusCheckData.consecutiveErrors > 2 ? 'aggressive' : 'normal' // Change check strategy if we've had errors
        }
      });

      console.log('Payment status check response:', data);

      if (error) {
        console.error('Error checking payment status:', error);
        
        // Increment retries and consecutive errors
        setStatusCheckData(prev => ({
          ...prev,
          retries: prev.retries + 1,
          consecutiveErrors: prev.consecutiveErrors + 1
        }));
        
        // If we've retried too many times, show an error
        if (statusCheckData.retries > 3) {
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

      // Token operation success handling with better detection
      if (data?.success && (data.data?.isTokenOperation || operationType === 'token_only')) {
        console.log('Token creation successful:', data);
        paymentVerifiedRef.current = true;
        clearStatusCheckInterval();
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          transactionId: data.data?.token || data.data?.transactionId || 'unknown'
        }));
        toast.success('אסימון נוצר בהצלחה, המנוי הופעל!');
        
        try {
          await supabase.from('payment_sessions').update({
            status: 'completed',
            transaction_id: data.data?.token || data.data?.transactionId
          })
          .eq('id', sessionId);
        } catch (dbError) { /* ignore */ }
        return;
      }
      
      // Handle token creation failure
      if (data?.failed && (data.data?.isTokenOperation || operationType === 'token_only')) {
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
      
      // Handle specific token creation timeout
      if ((data?.timeout && (data.data?.isTokenOperation || operationType === 'token_only')) ||
          (operationType === 'token_only' && statusCheckData.attempts >= 25)) {
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
          await supabase.from('payment_sessions')
            .update({
              status: 'completed',
              transaction_id: data.data?.transactionId
            })
            .eq('id', sessionId);
        } catch (dbError) {}
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
        
        // Show progress toast after a few checks so user knows something is happening
        if (statusCheckData.attempts === 4) {
          toast.info(operationType === 'token_only' ? 
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
    
    // Reset last check time
    lastCheckTimeRef.current = 0;
    
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
    const initialCheckInterval = operationType === 'token_only' ? 2000 : 3000;
    
    // Set up adaptive polling with increasingly longer intervals
    const intervalId = setInterval(() => {
      // Get maximum processing time based on operation type
      const maxTime = operationType === 'token_only' 
        ? MAX_PROCESSING_TIME.token_only 
        : MAX_PROCESSING_TIME.payment;
      
      // Check if maximum processing time has been exceeded
      if (startTimeRef.current && (Date.now() - startTimeRef.current > maxTime)) {
        clearInterval(intervalId);
        console.log(`Payment processing timeout exceeded for ${operationType} after ${Math.round((Date.now() - startTimeRef.current)/1000)} seconds`);
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED 
        }));
        toast.error(operationType === 'token_only' 
          ? 'חריגת זמן ביצירת אסימון, אנא נסה שנית' 
          : 'חריגת זמן בביצוע התשלום, אנא נסה שנית');
        return;
      }
      
      // Perform status check with adaptive interval
      checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
      
    }, initialCheckInterval);
    
    // Save interval ID for cleanup
    setStatusCheckData(prev => ({
      ...prev,
      intervalId,
      lpCode: lowProfileCode,
      sessionId,
      operationType,
      attempts: 0,
      retries: 0,
      consecutiveErrors: 0
    }));
    
  }, [clearStatusCheckInterval, checkPaymentStatus, setState]);

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck: clearStatusCheckInterval
  };
};
