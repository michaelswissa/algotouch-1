
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRedirectPaymentProps {
  onSuccess?: (sessionData: any) => void;
  onError?: (error: Error) => void;
}

export const useRedirectPayment = ({
  onSuccess,
  onError
}: UseRedirectPaymentProps = {}) => {
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  
  const createRedirectPayment = useCallback(async ({
    planId,
    amount,
    userEmail,
    fullName,
  }: {
    planId: string;
    amount: number;
    userEmail: string;
    fullName: string;
  }) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
        body: {
          planId,
          amount,
          operation: planId === 'monthly' ? 'ChargeAndCreateToken' : 'ChargeOnly',
          invoiceInfo: {
            fullName,
            email: userEmail,
          },
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          }
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.message || 'Failed to initialize payment redirection');
      }
      
      setSessionData(data.data);
      
      if (onSuccess) {
        onSuccess(data.data);
      }
      
      return data.data;
    } catch (error) {
      console.error('Error creating redirect payment:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת עמוד תשלום');
      
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error'));
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  const redirectToPayment = useCallback((url: string) => {
    if (!url) {
      toast.error('חסרה כתובת מעבר לתשלום');
      return;
    }
    
    window.location.href = url;
  }, []);

  return {
    loading,
    sessionData,
    createRedirectPayment,
    redirectToPayment
  };
};
