
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlanType, PaymentSession } from '@/types/payment';
import { toast } from 'sonner';

export const usePaymentFlow = () => {
  const [isInitializing, setIsInitializing] = useState(false);

  const initializePayment = useCallback(async (planId: PlanType) => {
    setIsInitializing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be logged in');
      }

      // Initialize payment session based on plan type
      const { data, error } = await supabase.functions.invoke('cardcom-init', {
        body: {
          planId,
          userId: user.id,
          operation: planId === 'monthly' ? 'CreateTokenOnly' 
            : planId === 'annual' ? 'ChargeAndCreateToken' 
            : 'ChargeOnly',
          timestamp: new Date().toISOString()
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Failed to initialize payment');
      }

      return {
        lowProfileCode: data.lowProfileCode,
        sessionId: data.sessionId,
        terminalNumber: data.terminalNumber,
        operation: data.operation
      };

    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('אירעה שגיאה באתחול התשלום');
      return null;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  return {
    isInitializing,
    initializePayment
  };
};
