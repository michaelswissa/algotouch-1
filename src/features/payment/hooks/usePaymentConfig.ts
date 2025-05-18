
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentConfig {
  terminalNumber: number;
  apiName: string;
  hasApiPassword: boolean;
}

export function usePaymentConfig() {
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.functions.invoke<PaymentConfig>('get-cardcom-config', {
          body: {}
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (!data || !data.terminalNumber || !data.apiName) {
          throw new Error('Invalid payment configuration received');
        }
        
        setPaymentConfig(data);
      } catch (err: any) {
        console.error('Error fetching payment configuration:', err);
        setError(err.message || 'Failed to load payment configuration');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchConfig();
  }, []);
  
  return {
    paymentConfig,
    isLoading,
    error
  };
}
