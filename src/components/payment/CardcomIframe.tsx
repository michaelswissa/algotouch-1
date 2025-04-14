
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<number>(600);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const statusCheckIntervalRef = React.useRef<number | null>(null);

  // Initialize payment
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);
        setInitError(null);
        
        // Build payment data
        const paymentData = {
          planId,
          amount,
          userId: user?.id,
          userName: userName || '',
          email: userEmail,
          returnValue: `${user?.id || 'guest'}_${planId}_${Date.now()}`
        };
        
        console.log('Initializing payment with data:', paymentData);
        
        // Call edge function with retry logic
        const maxRetries = 2;
        let attempt = 0;
        let data = null;
        let error = null;
        
        while (attempt <= maxRetries) {
          try {
            const response = await supabase.functions.invoke('cardcom-openfields', {
              body: paymentData
            });
            
            if (response.error) {
              throw new Error(`Error initializing payment: ${response.error.message}`);
            }
            
            data = response.data;
            if (data?.success && data?.url) {
              break; // Success, exit retry loop
            } else {
              throw new Error(data?.error || 'Failed to generate payment URL');
            }
          } catch (err) {
            error = err;
            attempt++;
            if (attempt <= maxRetries) {
              console.log(`Payment initialization attempt ${attempt} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
        
        if (!data?.success || !data?.url) {
          throw error || new Error('Failed to initialize payment after multiple attempts');
        }
        
        // Store payment URL and ID
        setPaymentUrl(data.url);
        setLowProfileId(data.lowProfileId);
        
        // Store in localStorage for retrieval after redirect or to recover from browser refresh
        if (data.lowProfileId) {
          localStorage.setItem('payment_pending_id', data.lowProfileId);
          localStorage.setItem('payment_pending_plan', planId);
          localStorage.setItem('payment_session_created', new Date().toISOString());
        }
        
      } catch (error) {
        console.error('Error initializing payment:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize payment');
        
        // Show error toast
        toast.error('שגיאה באתחול תהליך התשלום, נסה שוב');
      } finally {
        setLoading(false);
      }
    };
    
    initializePayment();
    
    // Cleanup function
    return () => {
      if (statusCheckIntervalRef.current) {
        window.clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, [planId, amount, user?.id, userName, userEmail, retryCount]);
  
  // Handle iframe load events
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    // Start checking payment status once iframe is loaded
    if (lowProfileId) {
      startPaymentStatusCheck();
    }
  };
  
  // Start checking payment status periodically
  const startPaymentStatusCheck = useCallback(() => {
    if (statusCheckIntervalRef.current) {
      window.clearInterval(statusCheckIntervalRef.current);
    }
    
    // Check status every 2 seconds
    statusCheckIntervalRef.current = window.setInterval(() => {
      checkPaymentStatus();
    }, 2000);
    
    // Clear interval after 2 minutes (maximum wait time)
    setTimeout(() => {
      if (statusCheckIntervalRef.current) {
        window.clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
    }, 120000); // 2 minutes
  }, [lowProfileId]);
  
  // Check payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!lowProfileId || paymentCompleted) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
        body: { 
          lowProfileId,
          planId
        }
      });
      
      if (error) {
        console.warn('Error checking payment status:', error);
        return;
      }
      
      console.log('Payment status check returned:', data);
      
      // Check if payment was successful
      const isSuccess = (
        data.ResponseCode === 0 || 
        data.OperationResponse === '0' || 
        (data.TranzactionInfo && data.TranzactionInfo.ResponseCode === 0) ||
        (data.paymentLog && data.paymentLog.status === 'completed')
      );
      
      if (isSuccess) {
        // Stop checking status
        if (statusCheckIntervalRef.current) {
          window.clearInterval(statusCheckIntervalRef.current);
          statusCheckIntervalRef.current = null;
        }
        
        setPaymentCompleted(true);
        setPaymentProcessing(false);
        
        // Clear session data
        localStorage.removeItem('payment_pending_id');
        localStorage.removeItem('payment_pending_plan');
        localStorage.removeItem('payment_session_created');
        
        // Call success callback
        onSuccess(lowProfileId);
      }
    } catch (error) {
      console.warn('Error checking payment status:', error);
    }
  }, [lowProfileId, paymentCompleted, planId, onSuccess]);
  
  // Adjust iframe height based on content
  useEffect(() => {
    const adjustIframeHeight = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          const height = iframeRef.current.contentWindow.document.body.scrollHeight;
          if (height > 200) {
            setIframeHeight(height + 30); // Add padding
          }
        } catch (e) {
          // Cross-origin restrictions might prevent accessing contentWindow properties
        }
      }
    };
    
    if (iframeLoaded) {
      adjustIframeHeight();
      // Try adjusting again after a short delay to account for dynamic content
      setTimeout(adjustIframeHeight, 1000);
    }
  }, [iframeLoaded]);
  
  // Monitor for payment messages from parent window
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
          setPaymentCompleted(true);
          setPaymentProcessing(false);
          onSuccess(lowProfileId || 'unknown');
        } else if (data.status === 'error' || data.error) {
          setPaymentProcessing(false);
          onError(data.message || data.Description || 'Payment failed');
        }
      } catch (error) {
        console.error('Error processing iframe message:', error);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lowProfileId, onSuccess, onError]);
  
  // Handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setInitError(null);
    setLoading(true);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="h-8 w-8 border-4 border-t-primary animate-spin rounded-full mr-2"></div>
        <span>טוען טופס תשלום...</span>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {initError}
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            חזור
          </Button>
          <Button onClick={handleRetry}>
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  if (!paymentUrl) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          לא ניתן ליצור טופס תשלום. נא לנסות שוב מאוחר יותר.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (paymentCompleted) {
    return (
      <Alert className="bg-green-50 border-green-200 text-green-800">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertDescription>התשלום התקבל בהצלחה! מעבד את הנתונים...</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <iframe
        ref={iframeRef}
        src={paymentUrl}
        width="100%"
        height={iframeHeight}
        frameBorder="0"
        allowTransparency
        className="rounded-md border border-input bg-white"
        style={{ minHeight: "600px" }}
        onLoad={handleIframeLoad}
      />
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={paymentProcessing}>
          חזור
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => window.open(paymentUrl, '_blank')}
          disabled={paymentProcessing}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          פתח בחלון נפרד
        </Button>
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        העסקה מאובטחת ע"י Cardcom בהתאם לתקני PCI DSS
      </div>
    </div>
  );
};

export default CardcomIframe;
