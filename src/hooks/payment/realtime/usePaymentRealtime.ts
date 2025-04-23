
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentRealtimeProps {
  setState: (updater: any) => void;
  cleanupStatusCheck: () => void;
  isMounted: React.MutableRefObject<boolean>;
}

export const usePaymentRealtime = ({ 
  setState, 
  cleanupStatusCheck, 
  isMounted 
}: UsePaymentRealtimeProps) => {
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeRetries, setRealtimeRetries] = useState(0);

  const setupRealtimeSubscription = useCallback((sessionId: string, cleanup: () => void) => {
    if (!sessionId) return null;
    
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
              cleanup();
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
              cleanup();
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
  }, [setState, isMounted, realtimeRetries]);

  return {
    realtimeConnected,
    realtimeRetries,
    setRealtimeRetries,
    setupRealtimeSubscription
  };
};
