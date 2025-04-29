
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { useNavigate } from 'react-router-dom';
import { PlanDetails } from '@/types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import PlanSummary from './PlanSummary';

interface IframePaymentSectionProps {
  planId: string;
  onPaymentComplete?: () => void;
  onBack?: () => void;
}

const IframePaymentSection: React.FC<IframePaymentSectionProps> = ({ 
  planId, 
  onPaymentComplete, 
  onBack 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [lowProfileId, setLowProfileId] = useState('');
  const navigate = useNavigate();

  const plans = getSubscriptionPlans();
  const plan = plans[planId as keyof typeof plans] as PlanDetails;

  // Initialize payment on mount
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setIsLoading(true);
        
        // Call CardCom API to create a payment session
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
        setLowProfileId(data.data.lowProfileId);
        setIframeUrl(data.data.redirectUrl);
        setIsLoading(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing payment';
        PaymentLogger.error('Payment initialization error:', error);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    };
    
    initializePayment();
  }, [planId]);

  // Check payment status at regular intervals
  useEffect(() => {
    if (!sessionId || !lowProfileId) return;
    
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cardcom-status', {
          body: {
            sessionId,
            lowProfileCode: lowProfileId
          }
        });
        
        if (error) {
          PaymentLogger.error('Error checking payment status:', error);
          return;
        }
        
        PaymentLogger.log('Payment status check:', data);
        
        if (data.data?.status === 'success') {
          toast.success('התשלום הושלם בהצלחה!');
          
          if (onPaymentComplete) {
            onPaymentComplete();
          } else {
            navigate('/subscription/success');
          }
        } else if (data.data?.status === 'failed') {
          toast.error('התשלום נכשל');
          navigate('/subscription/failed');
        }
      } catch (error) {
        PaymentLogger.error('Error checking payment status:', error);
      }
    };
    
    // Check status every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    
    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [sessionId, lowProfileId, onPaymentComplete, navigate]);

  // Handle direct payment button click
  const handleDirectPayment = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      if (!iframeUrl) {
        throw new Error('מערכת התשלום לא אותחלה כראוי');
      }
      
      // Redirect to CardCom payment page
      window.location.href = iframeUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <CardTitle>תשלום עבור {plan?.name || 'התוכנית'}</CardTitle>
        <CardDescription>
          השלם את התשלום באמצעות כרטיס אשראי
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <PlanSummary 
          planName={plan.name} 
          planId={plan.id}
          price={plan.price}
          displayPrice={plan.displayPrice}
          description={plan.description} 
          hasTrial={plan.hasTrial}
          freeTrialDays={plan.freeTrialDays}
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>מתחבר למערכת התשלום...</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden relative pt-[56.25%] w-full">
            <iframe 
              className="absolute top-0 left-0 w-full h-full"
              src={iframeUrl}
              title="CardCom Payment"
              sandbox="allow-forms allow-scripts allow-same-origin"
            />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2">
        {!isLoading && (
          <>
            <Button 
              type="button" 
              className="w-full" 
              onClick={handleDirectPayment}
              disabled={!iframeUrl || isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  מעבר לדף התשלום...
                </span>
              ) : (
                'מעבר לדף התשלום'
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {plan?.hasTrial 
                ? 'החיוב הראשון יבוצע בתום תקופת הניסיון' 
                : 'החיוב יבוצע מיידית'}
            </p>
          </>
        )}
        
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="absolute top-4 right-4"
            disabled={isProcessing}
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default IframePaymentSection;
