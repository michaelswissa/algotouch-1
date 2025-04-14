
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface CardcomIframeProps {
  planId: string;
  userId?: string;
  fullName?: string;
  email?: string;
  onComplete?: (lowProfileId: string) => void;
  onError?: (error: string) => void;
}

const CardcomIframe: React.FC<CardcomIframeProps> = ({
  planId,
  userId,
  fullName,
  email,
  onComplete,
  onError
}) => {
  const navigate = useNavigate();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentSession = async () => {
      try {
        setLoading(true);
        
        // Get the host URL for redirects
        const hostUrl = window.location.origin;
        
        // Create payment session via Cardcom Edge Function
        const { data, error: fnError } = await supabase.functions.invoke('cardcom-payment', {
          body: {
            planId,
            userId,
            fullName,
            email,
            operationType: 1, // 1 = ChargeOnly
            successRedirectUrl: `${hostUrl}/subscription?step=4&success=true&planId=${planId}`,
            errorRedirectUrl: `${hostUrl}/subscription?step=3&error=true&planId=${planId}`
          }
        });

        if (fnError) {
          throw new Error(`Payment creation error: ${fnError.message}`);
        }

        if (!data?.success || !data?.url) {
          throw new Error('Failed to create payment session');
        }

        // Store payment ID for later status checks
        if (data.lowProfileId) {
          setLowProfileId(data.lowProfileId);
          localStorage.setItem('payment_pending_id', data.lowProfileId);
          localStorage.setItem('payment_pending_plan', planId);
          localStorage.setItem('payment_session_created', new Date().toISOString());
        }

        // Set the iframe URL
        setIframeUrl(data.url);
        
      } catch (err: any) {
        console.error('Failed to create Cardcom payment:', err);
        setError(err?.message || 'אירעה שגיאה ביצירת עמוד התשלום');
        
        // Notify parent component
        if (onError) {
          onError(err?.message || 'אירעה שגיאה ביצירת עמוד התשלום');
        }
        
        toast.error('אירעה שגיאה ביצירת עמוד התשלום');
      } finally {
        setLoading(false);
      }
    };

    createPaymentSession();

    // Clean up function
    return () => {
      // Anything needed for cleanup
    };
  }, [planId, userId, fullName, email, onError]);

  // Listen for messages from the iframe (for completion events)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin if needed
      if (event.data && event.data.type === 'cardcom-payment-complete') {
        if (onComplete && lowProfileId) {
          onComplete(lowProfileId);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete, lowProfileId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Spinner className="h-8 w-8 mb-4" />
        <p className="text-center text-muted-foreground">טוען עמוד תשלום...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>שגיאה ביצירת עמוד תשלום</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!iframeUrl) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>שגיאה</AlertTitle>
        <AlertDescription>לא ניתן ליצור עמוד תשלום. אנא נסה שוב מאוחר יותר.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full overflow-hidden border">
      <CardContent className="p-0">
        <iframe
          src={iframeUrl}
          style={{ 
            width: '100%', 
            height: '600px', 
            border: 'none',
            overflow: 'hidden'
          }}
          title="Cardcom Payment"
        />
      </CardContent>
    </Card>
  );
};

export default CardcomIframe;
