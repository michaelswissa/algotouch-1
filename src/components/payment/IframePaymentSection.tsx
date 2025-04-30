
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { PaymentStatusEnum } from '@/types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import PlanSummary from './PlanSummary';
import SecurityNote from './SecurityNote';
import { usePaymentIframe } from '@/hooks/payment/usePaymentIframe';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

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
  const { 
    isLoading, 
    iframeUrl, 
    paymentStatus, 
    error, 
    retryPayment 
  } = usePaymentIframe({ 
    planId, 
    onPaymentComplete 
  });

  const plans = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? plans.annual 
    : planId === 'vip' 
      ? plans.vip 
      : plans.monthly;

  // Log when iframe URL changes
  useEffect(() => {
    if (iframeUrl) {
      PaymentLogger.log('Iframe URL set in component:', iframeUrl);
    }
  }, [iframeUrl]);

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    PaymentLogger.log('Iframe loaded successfully');
  };

  const handleIframeError = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    PaymentLogger.error('Iframe loading error:', e);
  };

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
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={retryPayment} variant="outline">
              נסה שנית
            </Button>
          </div>
        ) : iframeUrl ? (
          <>
            {/* Development only - URL display for debugging */}
            {import.meta.env.DEV && (
              <div className="bg-slate-100 p-2 rounded text-xs mb-2 overflow-hidden">
                <div className="font-semibold">Debug - Iframe URL:</div>
                <div className="truncate">{iframeUrl}</div>
              </div>
            )}
            <div className="rounded-lg border overflow-hidden relative pt-[56.25%] w-full">
              <iframe 
                className="absolute top-0 left-0 w-full h-full"
                src={iframeUrl}
                title="CardCom Payment"
                frameBorder="0"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-4" />
            <p className="text-amber-500 mb-4">לא ניתן לטעון את טופס התשלום</p>
            <Button onClick={retryPayment} variant="outline">
              נסה שנית
            </Button>
          </div>
        )}
        
        <SecurityNote />
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
