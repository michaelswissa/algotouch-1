
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
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(600);
  const [retryCount, setRetryCount] = useState(0);
  const [isPaymentInit, setIsPaymentInit] = useState(false);

  // Initialize payment session and get iframe URL
  useEffect(() => {
    const initPayment = async () => {
      try {
        setLoading(true);
        setIsPaymentInit(true);
        setError(null);
        
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
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
        setError(errorMessage);
        onError(errorMessage);
      } finally {
        setLoading(false);
        setIsPaymentInit(false);
      }
    };
    
    if (!isPaymentInit) {
      initPayment();
    }
  }, [planId, amount, user?.id, userName, userEmail, onError, retryCount, isPaymentInit]);

  // Handle iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only process messages from trusted domains
      if (!event.origin.includes('cardcom.solutions')) {
        return;
      }
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        console.log('Received message from iframe:', data);
        
        // Handle payment success
        if (data.status === 'success' || (data.ResponseCode === 0 && data.OperationResponse === '0')) {
          const transactionId = data.TranzactionId || data.lowProfileId || lowProfileId || 'unknown';
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
  }, [onSuccess, onError, lowProfileId]);

  // Check payment status from localStorage on component mount
  useEffect(() => {
    const pendingId = localStorage.getItem('payment_pending_id');
    const pendingPlan = localStorage.getItem('payment_pending_plan');
    const sessionCreated = localStorage.getItem('payment_session_created');
    
    if (pendingId && pendingPlan && sessionCreated) {
      // Check if the pending payment is for the current plan
      if (pendingPlan === planId) {
        const createdDate = new Date(sessionCreated);
        const now = new Date();
        const timeDiff = now.getTime() - createdDate.getTime();
        
        // If the session is less than 2 hours old, check its status
        if (timeDiff < 2 * 60 * 60 * 1000) {
          console.log(`Found pending payment session ${pendingId} for plan ${pendingPlan}`);
          setLowProfileId(pendingId);
          
          // Check payment status after a short delay
          setTimeout(() => {
            checkPaymentStatus(pendingId, pendingPlan);
          }, 1000);
        } else {
          // Session is too old, clear it
          localStorage.removeItem('payment_pending_id');
          localStorage.removeItem('payment_pending_plan');
          localStorage.removeItem('payment_session_created');
        }
      }
    }
  }, [planId]);

  // Check payment status with edge function
  const checkPaymentStatus = async (id: string, plan: string) => {
    try {
      console.log(`Checking payment status for ${id}, plan ${plan}`);
      
      const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
        body: { lowProfileId: id, planId: plan }
      });
      
      if (error) {
        console.error('Error checking payment status:', error);
        return;
      }
      
      console.log('Payment status check response:', data);
      
      if (data.OperationResponse === '0' || (data.paymentLog && data.paymentLog.status === 'completed')) {
        // Payment was successful
        toast.success('התשלום הושלם בהצלחה!');
        onSuccess(id);
        
        // Clear localStorage
        localStorage.removeItem('payment_pending_id');
        localStorage.removeItem('payment_pending_plan');
        localStorage.removeItem('payment_session_created');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // If we have a lowProfileId but the iframe is not showing properly, provide a direct link
  const handleRedirectToPayment = () => {
    if (iframeUrl) {
      window.open(iframeUrl, '_blank');
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setIsPaymentInit(false);
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
          <Button onClick={handleRetry} size="sm">
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
          src={iframeUrl}
          width="100%"
          height={iframeHeight}
          frameBorder="0"
          title="טופס תשלום"
          allow="payment"
          className="w-full"
          style={{ minHeight: "600px" }}
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
