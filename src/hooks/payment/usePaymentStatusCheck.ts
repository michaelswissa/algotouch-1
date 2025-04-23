
import { useState, useCallback, useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const [lowProfileCode, setLowProfileCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [operationType, setOperationType] = useState<'payment' | 'token_only'>('payment');
  const [planId, setPlanId] = useState<string>('');
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  
  const cleanupStatusCheck = useCallback(() => {
    console.log('Cleaning up payment status check:', {
      hasInterval: !!intervalId,
      hasChannel: !!realtimeChannel
    });
    
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      setRealtimeChannel(null);
    }
    
    setAttempt(0);
    setLowProfileCode(null);
    setSessionId(null);
  }, [intervalId, realtimeChannel]);
  
  useEffect(() => {
    return () => {
      cleanupStatusCheck();
    };
  }, [cleanupStatusCheck]);
  
  const checkPaymentStatus = useCallback(async () => {
    if (!lowProfileCode || !sessionId) {
      console.error('Missing required parameters for payment status check');
      return false;
    }
    
    console.log(`Checking payment status (attempt ${attempt}):`, { 
      lowProfileCode, 
      sessionId, 
      operationType 
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode,
          sessionId,
          timestamp: new Date().toISOString(),
          attempt,
          operationType
        }
      });
      
      console.log('Status check response:', data);
      
      if (error) {
        console.error('Error checking payment status:', error);
        return false;
      }
      
      if (data.success) {
        console.log('Payment successful!');
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
        
        return true;
      } else if (data.failed || data.timeout) {
        console.log('Payment failed or timed out');
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
        
        return false;
      }
      
      setAttempt(prev => prev + 1);
      return false;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }, [lowProfileCode, sessionId, attempt, operationType, setState, cleanupStatusCheck]);
  
  const setupRealtimeSubscription = useCallback((sessionId: string) => {
    if (!sessionId) return;
    
    console.log('Setting up realtime subscription for payment session:', sessionId);
    
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
      .subscribe();
    
    setRealtimeChannel(channel);
  }, [cleanupStatusCheck, setState]);
  
  const startStatusCheck = useCallback((
    newLowProfileCode: string, 
    newSessionId: string,
    newOperationType: 'payment' | 'token_only' = 'payment',
    newPlanId: string = ''
  ) => {
    cleanupStatusCheck();
    
    console.log('Starting payment status check for:', {
      lowProfileCode: newLowProfileCode,
      sessionId: newSessionId,
      operationType: newOperationType,
      planId: newPlanId
    });
    
    setLowProfileCode(newLowProfileCode);
    setSessionId(newSessionId);
    setOperationType(newOperationType);
    setPlanId(newPlanId);
    setAttempt(0);
    
    setupRealtimeSubscription(newSessionId);
    
    const id = window.setInterval(checkPaymentStatus, 5000);
    setIntervalId(id);
    
    setTimeout(checkPaymentStatus, 500);
  }, [cleanupStatusCheck, checkPaymentStatus, setupRealtimeSubscription]);
  
  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
