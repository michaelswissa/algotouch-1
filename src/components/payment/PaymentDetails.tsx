
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import SecurityNote from './SecurityNote';
import { PaymentStatusEnum } from '@/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

interface PaymentDetailsProps {
  planId: string;
  terminalNumber: string;
  cardcomUrl: string;
  isReady?: boolean;
  onPaymentStatus?: (status: PaymentStatusEnum) => void;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  planId,
  terminalNumber,
  cardcomUrl = 'https://secure.cardcom.solutions',
  isReady = false,
  onPaymentStatus
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  
  useEffect(() => {
    if (!isReady || !planId) return;
    
    const initializePayment = async () => {
      try {
        setIsLoading(true);
        PaymentLogger.log('Initializing payment for plan:', planId);
        
        // Get payment configuration from the server
        const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
          body: {
            planId
          }
        });
        
        if (error) {
          throw new Error(`Failed to initialize payment: ${error.message}`);
        }
        
        if (!data?.success || !data?.data?.redirectUrl) {
          throw new Error('Invalid response from payment service');
        }
        
        PaymentLogger.log('Payment initialized successfully', data);
        
        setSessionId(data.data.sessionId);
        setIframeUrl(data.data.redirectUrl);
        setIsLoading(false);
        
        if (onPaymentStatus) {
          onPaymentStatus(PaymentStatusEnum.IDLE);
        }
      } catch (error) {
        PaymentLogger.error('Payment initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing payment';
        toast.error(errorMessage);
        setIsLoading(false);
        
        if (onPaymentStatus) {
          onPaymentStatus(PaymentStatusEnum.FAILED);
        }
      }
    };
    
    initializePayment();
  }, [isReady, planId, onPaymentStatus]);

  // Setup message listener for iframe communication
  useEffect(() => {
    if (!sessionId) return;

    const checkPaymentStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cardcom-status', {
          body: {
            sessionId
          }
        });

        if (error) {
          PaymentLogger.error('Error checking payment status:', error);
          return;
        }

        if (data?.data?.status === 'success') {
          PaymentLogger.log('Payment completed successfully');
          if (onPaymentStatus) {
            onPaymentStatus(PaymentStatusEnum.SUCCESS);
          }
        } else if (data?.data?.status === 'failed') {
          PaymentLogger.log('Payment failed');
          if (onPaymentStatus) {
            onPaymentStatus(PaymentStatusEnum.FAILED);
          }
        }
      } catch (error) {
        PaymentLogger.error('Error checking payment status:', error);
      }
    };

    // Check status initially
    checkPaymentStatus();
    
    // And set interval to check periodically
    const statusInterval = setInterval(checkPaymentStatus, 5000);
    
    // Cleanup interval on unmount
    return () => clearInterval(statusInterval);
  }, [sessionId, onPaymentStatus]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>מתחבר למערכת התשלום...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-lg border overflow-hidden relative w-full pt-[56.25%]">
        {iframeUrl && (
          <iframe 
            className="absolute top-0 left-0 w-full h-full"
            src={iframeUrl}
            title="CardCom Payment"
            frameBorder="0"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          ></iframe>
        )}
      </div>

      <SecurityNote />
    </div>
  );
};

export default PaymentDetails;
