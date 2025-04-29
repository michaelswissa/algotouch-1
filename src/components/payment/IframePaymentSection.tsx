
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { useNavigate } from 'react-router-dom';
import { PaymentStatusEnum } from '@/types/payment';
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusEnum>(PaymentStatusEnum.IDLE);
  const [iframeUrl, setIframeUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const navigate = useNavigate();

  const plans = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? plans.annual 
    : planId === 'vip' 
      ? plans.vip 
      : plans.monthly;

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
    if (!sessionId) return;
    
    const checkStatus = async () => {
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
        
        PaymentLogger.log('Payment status check:', data);
        
        if (data?.data?.status === 'success') {
          setPaymentStatus(PaymentStatusEnum.SUCCESS);
          toast.success('התשלום הושלם בהצלחה!');
          
          if (onPaymentComplete) {
            onPaymentComplete();
          } else {
            navigate('/subscription/success');
          }
        } else if (data?.data?.status === 'failed') {
          setPaymentStatus(PaymentStatusEnum.FAILED);
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
  }, [sessionId, onPaymentComplete, navigate]);

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <CardTitle>תשלום עבור {plan.name}</CardTitle>
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
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2">
        <p className="text-xs text-center text-muted-foreground">
          {plan.hasTrial 
            ? 'החיוב הראשון יבוצע בתום תקופת הניסיון' 
            : 'החיוב יבוצע מיידית'}
        </p>
        
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="mt-2"
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default IframePaymentSection;
