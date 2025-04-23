
import { useState, useCallback, useEffect, useRef } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { usePaymentDiagnostics } from './state/usePaymentDiagnostics';
import { usePaymentRealtime } from './realtime/usePaymentRealtime';
import { usePaymentStatusPoller } from './status/usePaymentStatusPoller';
import { supabase } from '@/integrations/supabase/client'; // Add missing import

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  // Core state
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const [lowProfileCode, setLowProfileCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [planId, setPlanId] = useState<string>('');
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Initialize diagnostic hook
  const { 
    diagnosticRef,
    resetDiagnostics,
    initializeDiagnostics,
    updateDiagnostics,
    getDiagnosticsSummary 
  } = usePaymentDiagnostics();

  // Initialize poller hook - must come before cleanupStatusCheck
  const {
    attempt,
    setAttempt,
    checkPaymentStatus
  } = usePaymentStatusPoller({
    setState,
    isMounted,
    updateDiagnostics
  });

  // Cleanup callback for re-use
  const cleanupStatusCheck = useCallback(() => {
    console.log('Cleaning up payment status check:', {
      hasInterval: !!intervalId,
      hasChannel: !!realtimeChannel,
      attempt
    });
    
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    
    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (e) {
        console.warn('Error removing Supabase channel:', e);
      }
      setRealtimeChannel(null);
    }
    
    setAttempt(0);
    setLowProfileCode(null);
    setSessionId(null);
    setRealtimeRetries(0);
    
    // Log diagnostics
    const summary = getDiagnosticsSummary();
    console.log('Payment status check diagnostics:', summary);
    
    resetDiagnostics();
  }, [intervalId, realtimeChannel, attempt, getDiagnosticsSummary, resetDiagnostics, setRealtimeChannel, setRealtimeRetries]);

  // Initialize realtime subscription handling
  const {
    realtimeChannel,
    setRealtimeChannel,
    realtimeConnected,
    realtimeRetries,
    setRealtimeRetries,
    setupRealtimeSubscription
  } = usePaymentRealtime({ 
    setState, 
    cleanupStatusCheck,
    isMounted 
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);
  
  // Start status check with proper parameter typing
  const startStatusCheck = useCallback((
    lowProfileCode: string,
    sessionId: string,
    operationType: 'payment' | 'token_only',
    planId: string
  ) => {
    if (!lowProfileCode || !sessionId) {
      console.error('Missing required parameters for status check:', { lowProfileCode, sessionId });
      return;
    }

    // Clean up any existing status check first
    cleanupStatusCheck();
    
    console.log('Starting payment status check for:', {
      lowProfileCode,
      sessionId,
      operationType,
      planId
    });
    
    // Initialize diagnostic data
    initializeDiagnostics();
    
    // Set state
    setLowProfileCode(lowProfileCode);
    setSessionId(sessionId);
    setOperationType(operationType);
    setPlanId(planId);
    setAttempt(0);
    
    // Set up realtime subscription
    const channel = setupRealtimeSubscription(sessionId);
    if (channel) {
      setRealtimeChannel(channel);
    }
    
    // Set up polling interval as backup
    const id = window.setInterval(() => {
      checkPaymentStatus(lowProfileCode, sessionId, operationType).catch(error => {
        console.error('Error in payment status check interval:', error);
        updateDiagnostics(String(error));
      });
    }, 5000);
    
    setIntervalId(id);
    
    // Immediate first check
    setTimeout(() => {
      checkPaymentStatus(lowProfileCode, sessionId, operationType).catch(error => {
        console.error('Error in immediate payment status check:', error);
        updateDiagnostics(String(error));
      });
    }, 500);
  }, [
    cleanupStatusCheck, 
    checkPaymentStatus, 
    setupRealtimeSubscription, 
    initializeDiagnostics,
    updateDiagnostics,
    setRealtimeChannel
  ]);
  
  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck,
    isRealtimeConnected: realtimeConnected,
    currentAttempt: attempt,
    diagnostics: diagnosticRef.current
  };
};
