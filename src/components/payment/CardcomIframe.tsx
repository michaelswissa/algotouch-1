
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { getSubscriptionPlans } from './utils/paymentHelpers';

interface CardcomIframeProps {
  planId: string;
  onPaymentComplete?: (transactionId: string) => void;
  onPaymentStart?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const CardcomIframe: React.FC<CardcomIframeProps> = ({
  planId,
  onPaymentComplete,
  onPaymentStart,
  onError,
  onCancel
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const plans = getSubscriptionPlans();
  const selectedPlan = plans[planId as keyof typeof plans] || plans.monthly;
  
  // Initialize payment
  useEffect(() => {
    const initPayment = async () => {
      try {
        if (!user || !user.email) {
          throw new Error('User not authenticated');
        }

        setLoading(true);
        setError(null);
        
        console.log('Initializing payment for:', { planId, email: user.email });
        
        const { data, error } = await supabase.functions.invoke('cardcom-payment', {
          body: {
            planId,
            amount: selectedPlan.price,
            userEmail: user.email,
            userName: user.user_metadata?.full_name || ''
          }
        });
        
        if (error) {
          console.error('Error initializing payment:', error);
          throw new Error(`Failed to initialize payment: ${error.message}`);
        }
        
        if (!data.success || !data.url) {
          console.error('Payment initialization failed:', data);
          throw new Error(data.error || 'Failed to generate payment URL');
        }
        
        console.log('Payment URL generated:', data.url);
        setPaymentUrl(data.url);
        setLowProfileId(data.lowProfileId);
        
        // Store payment data in local storage for recovery
        localStorage.setItem('payment_pending_id', data.lowProfileId);
        localStorage.setItem('payment_pending_plan', planId);
        localStorage.setItem('payment_session_created', new Date().toISOString());
        
      } catch (err) {
        console.error('Payment initialization error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        if (onError) onError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    initPayment();
  }, [planId, user, selectedPlan.price, onError]);
  
  // Check payment status
  useEffect(() => {
    if (!lowProfileId) return;
    
    const checkPaymentStatus = async () => {
      try {
        // Wait 2 seconds before checking status for the first time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
          body: { lowProfileId, planId }
        });
        
        if (error) {
          console.error('Error checking payment status:', error);
          return;
        }
        
        console.log('Payment status:', data);
        
        if (data.success && data.status === 'completed') {
          setProcessingPayment(false);
          if (onPaymentComplete) onPaymentComplete(data.paymentLog?.id || lowProfileId);
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }
    };
    
    // Only check if we're tracking a payment
    const messageHandler = (event: MessageEvent) => {
      // Check if this is a message from the payment iframe
      if (event.data && event.data.type === 'cardcom-payment-completed') {
        console.log('Payment completion notification received from iframe');
        setProcessingPayment(true);
        checkPaymentStatus();
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [lowProfileId, planId, onPaymentComplete]);
  
  const handleCancel = () => {
    if (onCancel) onCancel();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 mr-2 animate-spin text-primary" />
        <span>מכין את דף התשלום...</span>
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
        
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleCancel}>חזור</Button>
        </div>
      </div>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>תשלום מאובטח</CardTitle>
        <CardDescription>
          {planId === 'monthly' ? 
            'התשלום הראשון יחויב לאחר תקופת הניסיון' : 
            'נא להזין את פרטי התשלום להשלמת ההזמנה'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paymentUrl ? (
          <div className="min-h-[500px] w-full">
            <iframe 
              src={paymentUrl}
              className="w-full h-[650px] border-0"
              title="תשלום מאובטח"
              sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation"
            />
          </div>
        ) : (
          <div className="flex justify-center items-center py-8">
            <AlertCircle className="h-8 w-8 mr-2 text-destructive" />
            <span>שגיאה בטעינת דף התשלום</span>
          </div>
        )}
        
        <div className="mt-4 text-center text-sm text-gray-500">
          התשלום מאובטח באמצעות אישורית זהב | כל פרטי האשראי מוצפנים ומאובטחים
        </div>
        
        <div className="mt-4">
          <Button variant="outline" onClick={handleCancel} className="w-full">
            ביטול
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CardcomIframe;
