
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

interface CardcomIframeProps {
  planId: string;
  amount: number;
  userName?: string;
  userEmail: string;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const CardcomIframe: React.FC<CardcomIframeProps> = ({
  planId,
  amount,
  userName,
  userEmail,
  onSuccess,
  onError,
  onCancel
}) => {
  const { user } = useAuth();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPaymentInit, setIsPaymentInit] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Initialize payment session
  useEffect(() => {
    const initPayment = async () => {
      if (retryCount >= 3) {
        setError('Failed to initialize payment after multiple attempts');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Prepare payment data
        const paymentData = {
          planId,
          amount,
          userId: user?.id,
          userName: userName || '',
          email: userEmail,
          returnValue: `${user?.id || 'guest'}_${planId}_${Date.now()}`
        };
        
        console.log('Initializing payment with data:', paymentData);
        
        // Call the payment initialization edge function
        const { data, error: apiError } = await supabase.functions.invoke('cardcom-payment', {
          body: paymentData
        });
        
        if (apiError) {
          throw new Error(`Error initializing payment: ${apiError.message}`);
        }
        
        if (!data?.success || !data?.url) {
          throw new Error(data?.error || 'Failed to generate payment URL');
        }
        
        // Store payment session data
        setIframeUrl(data.url);
        setTransactionId(data.lowProfileId);
        
        // Store in localStorage for retrieval after redirect
        if (data.lowProfileId) {
          localStorage.setItem('payment_pending_id', data.lowProfileId);
          localStorage.setItem('payment_pending_plan', planId);
          localStorage.setItem('payment_session_created', new Date().toISOString());
        }
      } catch (error) {
        console.error('Error initializing payment:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize payment');
        
        // Retry after a delay
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, (retryCount + 1) * 2000);
      } finally {
        setLoading(false);
      }
    };

    if (!isPaymentInit) {
      initPayment();
      setIsPaymentInit(true);
    }
  }, [planId, amount, user?.id, userName, userEmail, onError, retryCount, isPaymentInit]);

  // Handle iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only process messages from Cardcom
      if (!event.origin.includes('cardcom.solutions')) {
        return;
      }
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        console.log('Received message from iframe:', data);
        
        if (data.status === 'success' || data.ResponseCode === 0) {
          onSuccess(transactionId || 'unknown');
        } else if (data.status === 'error' || data.error) {
          onError(data.message || data.Description || 'Payment failed');
        }
      } catch (error) {
        console.error('Error processing iframe message:', error);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, onError, transactionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="h-8 w-8 border-4 border-t-primary animate-spin rounded-full mr-2"></div>
        <span>טוען טופס תשלום...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            חזור
          </Button>
          <Button onClick={() => {
            setError(null);
            setRetryCount(0);
            setIsPaymentInit(false);
          }}>
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  if (!iframeUrl) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          לא ניתן ליצור טופס תשלום. נא לנסות שוב מאוחר יותר.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <iframe
        src={iframeUrl}
        width="100%"
        height="600"
        frameBorder="0"
        allowTransparency
        className="rounded-md border border-input bg-white"
        style={{ minHeight: "600px" }}
      />
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          חזור
        </Button>
        <Button variant="ghost" onClick={() => window.open(iframeUrl, '_blank')}>
          פתח בחלון נפרד
        </Button>
      </div>
    </div>
  );
};

export default CardcomIframe;
