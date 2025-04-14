
import React, { useState, useEffect, useRef } from 'react';
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
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(600);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize payment session and get iframe URL
  useEffect(() => {
    const initPayment = async () => {
      try {
        setLoading(true);
        
        // Prepare payment data
        const paymentData = {
          planId,
          amount,
          userId: user?.id,
          userName: userName || '',
          email: userEmail,
          returnValue: `${user?.id || 'guest'}_${planId}_${new Date().getTime()}`,
          isRecurring: planId !== 'vip'
        };
        
        console.log('Initializing payment with data:', paymentData);
        
        // Call the edge function to create a Cardcom LowProfile page
        const { data, error: apiError } = await supabase.functions.invoke('cardcom-payment', {
          body: paymentData
        });
        
        if (apiError) {
          console.error('Edge function error:', apiError);
          throw new Error(`Error initializing payment: ${apiError.message}`);
        }
        
        if (!data || !data.success || !data.url) {
          console.error('Payment initialization failed:', data);
          throw new Error(data?.error || 'Failed to generate payment URL');
        }
        
        console.log('Payment session initialized:', data);
        setIframeUrl(data.url);
        
        // Store the session ID for reference
        if (data.lowProfileId) {
          setLowProfileId(data.lowProfileId);
          localStorage.setItem('payment_pending_id', data.lowProfileId);
          localStorage.setItem('payment_pending_plan', planId);
          localStorage.setItem('payment_session_created', new Date().toISOString());
        }
      } catch (error) {
        console.error('Error initializing payment:', error);
        
        if (retryCount < 2) {
          console.log(`Retry attempt ${retryCount + 1}...`);
          setRetryCount(prev => prev + 1);
          return;
        }
        
        setError(error instanceof Error ? error.message : 'Failed to initialize payment');
        onError(error instanceof Error ? error.message : 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };
    
    initPayment();
  }, [planId, amount, user, userName, userEmail, onError, retryCount]);

  // Handle iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only process messages from Cardcom domains
      if (!event.origin.includes('cardcom.solutions')) {
        return;
      }
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        console.log('Received message from iframe:', data);
        
        // Handle payment success
        if (data.status === 'success' || (data.ResponseCode === 0 && data.OperationResponse === '0')) {
          const transactionId = data.TranzactionId || data.lowProfileId || 'unknown';
          onSuccess(transactionId);
        } 
        // Handle payment error
        else if (data.status === 'error' || data.error) {
          onError(data.message || data.Description || 'Payment failed');
        }
        
        // Handle iframe height changes
        if (data.type === 'resize' && data.height) {
          setIframeHeight(data.height);
        }
      } catch (error) {
        console.error('Error processing iframe message:', error);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, onError]);

  // If we have a lowProfileId but the iframe is not showing properly, provide a direct link
  const handleRedirectToPayment = () => {
    if (iframeUrl) {
      window.open(iframeUrl, '_blank');
    }
  };

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
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} size="sm">
            חזור
          </Button>
          <Button onClick={() => setRetryCount(prev => prev + 1)} size="sm">
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  if (!iframeUrl) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>לא ניתן ליצור טופס תשלום. נא לנסות שוב מאוחר יותר.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="w-full rounded-md overflow-hidden border border-gray-200">
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          width="100%"
          height={iframeHeight}
          frameBorder="0"
          title="Payment Form"
          allow="payment"
          className="w-full"
        />
      </div>

      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel} 
        >
          חזור
        </Button>
        
        <Button 
          variant="default"
          onClick={handleRedirectToPayment}
        >
          פתח בחלון נפרד
        </Button>
      </div>
    </div>
  );
};

export default CardcomIframe;
