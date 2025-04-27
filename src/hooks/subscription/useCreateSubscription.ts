
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseCreateSubscriptionOptions {
  onSuccess?: () => void;
}

export const useCreateSubscription = (options?: UseCreateSubscriptionOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const createSubscription = async (planId: string) => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Call the edge function to create the subscription
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: { 
          planId, 
          userId: user.id,
          action: 'create_subscription'
        }
      });
      
      if (error) {
        throw new Error(`Failed to create subscription: ${error.message}`);
      }
      
      // Handle successful subscription creation
      if (data?.success) {
        toast.success('המנוי נוצר בהצלחה! מיד תועבר למסך התשלום');
        
        // Redirect to payment URL if provided
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else if (options?.onSuccess) {
          options.onSuccess();
        }
      } else {
        throw new Error(data?.message || 'Failed to create subscription');
      }
    } catch (err: any) {
      console.error('Error creating subscription:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error(err?.message || 'Unknown error'));
      toast.error(err?.message || 'אירעה שגיאה ביצירת המנוי');
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    createSubscription,
    isLoading,
    isError,
    error
  };
};
