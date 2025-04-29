
import React, { useState, useCallback } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

interface RedirectPaymentButtonProps extends ButtonProps {
  planId: string;
  children: React.ReactNode;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

const RedirectPaymentButton: React.FC<RedirectPaymentButtonProps> = ({
  planId,
  children,
  onSuccess,
  onError,
  ...buttonProps
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      PaymentLogger.log('Initializing redirect payment for plan:', planId);

      // Get current URL to create redirect URLs
      const currentUrl = window.location.origin;
      const successUrl = `${currentUrl}/payment/success`;
      const errorUrl = `${currentUrl}/payment/error`;
      const webhookUrl = `${currentUrl}/api/cardcom-webhook`;

      // Call the cardcom-redirect edge function to get the redirect URL
      const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
        body: {
          planId,
          successUrl,
          errorUrl,
          webhookUrl
        }
      });

      if (error) {
        throw new Error(`Failed to initialize payment: ${error.message}`);
      }

      if (!data?.success || !data?.data?.redirectUrl) {
        throw new Error('Invalid response from payment service');
      }

      // Success - redirect to CardCom payment page
      PaymentLogger.log('Redirect URL received, redirecting user to CardCom');
      
      if (onSuccess) {
        onSuccess(data.data.sessionId);
      }
      
      // Redirect to the payment page
      window.location.href = data.data.redirectUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing payment';
      PaymentLogger.error('Payment initialization error', error);
      toast.error(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
      
      setIsLoading(false);
    }
  }, [isLoading, planId, onSuccess, onError]);

  return (
    <Button {...buttonProps} onClick={handleClick} disabled={isLoading || buttonProps.disabled}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
          מתחבר למערכת התשלום...
        </>
      ) : (
        children
      )}
    </Button>
  );
};

export default RedirectPaymentButton;
