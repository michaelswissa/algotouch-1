import { useState, useCallback, useEffect, useRef } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  // Core state
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const [lowProfileCode, setLowProfileCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [planId, setPlanId] = useState<string>('');
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Realtime channel state with retry mechanism
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeRetries, setRealtimeRetries] = useState(0);
  
  // Diagnostic data
  const diagnosticRef = useRef<{
    startTime: number;
    lastCheckTime: number;
    statusChecks: number;
    errors: string[];
  }>({
    startTime: 0,
    lastCheckTime: 0,
    statusChecks: 0,
    errors: []
  });
  
  // Cleanup all resources
  const cleanupStatusCheck = useCallback(() => {
    console.log('Cleaning up payment status check:', {
      hasInterval: !!intervalId,
      hasChannel: !!realtimeChannel,
      attempt
    });
    
    // Clear interval
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    
    // Close Realtime channel if it exists
    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (e) {
        console.warn('Error removing Supabase channel:', e);
      }
      setRealtimeChannel(null);
      setRealtimeConnected(false);
    }
    
    // Reset state
    setAttempt(0);
    setLowProfileCode(null);
    setSessionId(null);
    setRealtimeRetries(0);
    
    // Log diagnostics
    const now = Date.now();
    const diagData = diagnosticRef.current;
    if (diagData.startTime > 0) {
      console.log('Payment status check diagnostics:', {
        totalDuration: now - diagData.startTime,
        checksPerformed: diagData.statusChecks,
        errors: diagData.errors
      });
    }
    
    // Reset diagnostics
    diagnosticRef.current = {
      startTime: 0,
      lastCheckTime: 0,
      statusChecks: 0,
      errors: []
    };
  }, [intervalId, realtimeChannel, attempt]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);
  
  // Payment status check with exponential backoff
  const checkPaymentStatus = useCallback(async () => {
    if (!lowProfileCode || !sessionId) {
      console.error('Missing required parameters for payment status check');
      return false;
    }
    
    // Update diagnostic data
    const now = Date.now();
    const diagData = diagnosticRef.current;
    diagData.lastCheckTime = now;
    diagData.statusChecks++;
    
    console.log(`Checking payment status (attempt ${attempt}):`, { 
      lowProfileCode, 
      sessionId, 
      operationType,
      timeSinceStart: diagData.startTime > 0 ? now - diagData.startTime : 0
    });
    
    try {
      // Query backend for payment status
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode,
          sessionId,
          timestamp: new Date().toISOString(),
          attempt,
          operationType
        }
      });
      
      // Log the raw response for debugging
      console.log('Status check response:', data);
      
      if (error) {
        console.error('Error checking payment status:', error);
        diagData.errors.push(`Network error: ${error.message}`);
        return false;
      }
      
      // Handle success case
      if (data.success) {
        console.log('Payment successful!');
        if (isMounted.current) {
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
      // Handle failure case
      else if (data.failed || data.timeout) {
        console.log('Payment failed or timed out:', data);
        if (isMounted.current) {
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
      
      // Processing still ongoing
      if (isMounted.current) {
        setAttempt(prev => prev + 1);
      }
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error checking payment status:', errorMessage);
      diagData.errors.push(errorMessage);
      return false;
    }
  }, [lowProfileCode, sessionId, attempt, operationType, setState, cleanupStatusCheck]);
  
  // Set up realtime subscription with robust reconnection
  const setupRealtimeSubscription = useCallback((sessionId: string) => {
    if (!sessionId) return null;
    
    // Don't try to set up more than 3 times
    if (realtimeRetries > 3) {
      console.warn('Max realtime retry attempts reached, falling back to polling only');
      return null;
    }
    
    console.log('Setting up realtime subscription for payment session:', sessionId);
    
    try {
      const channel = supabase
        .channel('payment-status-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payment_sessions',
            filter: `id=eq.${sessionId}`
          },
          (payload) => {
            console.log('Realtime update received:', payload);
            
            if (!isMounted.current) {
              console.log('Component unmounted, ignoring realtime update');
              return;
            }
            
            const newStatus = payload.new.status;
            
            if (newStatus === 'completed') {
              console.log('Payment completed via realtime notification!');
              cleanupStatusCheck();
              setState(prev => ({ 
                ...prev, 
                paymentStatus: PaymentStatus.SUCCESS,
                transaction_data: payload.new.transaction_data
              }));
              
              window.postMessage({
                action: 'payment-status-update',
                status: 'success',
                data: payload.new.transaction_data
              }, window.location.origin);
            } else if (newStatus === 'failed') {
              console.log('Payment failed via realtime notification');
              cleanupStatusCheck();
              setState(prev => ({ 
                ...prev, 
                paymentStatus: PaymentStatus.FAILED,
                error: 'התשלום נכשל'
              }));
              
              toast.error('התשלום נכשל');
            }
          }
        )
        .on('presence', { event: 'sync' }, () => {
          setRealtimeConnected(true);
          console.log('Realtime connection synced');
        })
        .on('disconnect', () => {
          setRealtimeConnected(false);
          console.log('Realtime connection disconnected');
        })
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            setRealtimeConnected(true);
          } else if (status === 'CHANNEL_ERROR') {
            setRealtimeConnected(false);
            setRealtimeRetries(prev => prev + 1);
            console.error('Error subscribing to realtime channel');
          }
        });
      
      return channel;
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
      setRealtimeRetries(prev => prev + 1);
      return null;
    }
  }, [cleanupStatusCheck, setState, realtimeRetries]);
  
  // Start status check with a robust initialization
  const startStatusCheck = useCallback((
    newLowProfileCode: string, 
    newSessionId: string,
    newOperationType: 'payment' | 'token_only' = 'payment',
    newPlanId: string = ''
  ) => {
    // Clean up any existing status check first
    cleanupStatusCheck();
    
    console.log('Starting payment status check for:', {
      lowProfileCode: newLowProfileCode,
      sessionId: newSessionId,
      operationType: newOperationType,
      planId: newPlanId
    });
    
    // Initialize diagnostic data
    diagnosticRef.current = {
      startTime: Date.now(),
      lastCheckTime: Date.now(),
      statusChecks: 0,
      errors: []
    };
    
    // Set state
    setLowProfileCode(newLowProfileCode);
    setSessionId(newSessionId);
    setOperationType(newOperationType);
    setPlanId(newPlanId);
    setAttempt(0);
    
    // Set up realtime subscription with full session info
    const channel = setupRealtimeSubscription(newSessionId);
    if (channel) {
      setRealtimeChannel(channel);
    }
    
    // Set up polling interval as backup
    const id = window.setInterval(() => {
      checkPaymentStatus().catch(error => {
        console.error('Error in payment status check interval:', error);
        diagnosticRef.current.errors.push(String(error));
      });
    }, 5000);
    
    setIntervalId(id);
    
    // Immediate first check
    setTimeout(() => {
      checkPaymentStatus().catch(error => {
        console.error('Error in immediate payment status check:', error);
        diagnosticRef.current.errors.push(String(error));
      });
    }, 500);
  }, [cleanupStatusCheck, checkPaymentStatus, setupRealtimeSubscription]);
  
  // Provide both the status checking functions and diagnostics
  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck,
    isRealtimeConnected: realtimeConnected,
    currentAttempt: attempt,
    diagnostics: diagnosticRef.current
  };
};
