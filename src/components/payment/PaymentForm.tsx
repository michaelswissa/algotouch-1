import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, RefreshCw } from 'lucide-react';
import PaymentContent from './PaymentContent';
import { usePayment } from '@/hooks/usePayment';
import { PaymentStatus } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';
import InitializingPayment from './states/InitializingPayment';
import { usePaymentTimeout } from '@/hooks/payment/usePaymentTimeout';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const {
    terminalNumber,
    cardcomUrl,
    paymentStatus,
    masterFrameRef,
    operationType,
    initializePayment,
    handleRetry,
    submitPayment,
    lowProfileCode,
    sessionId,
    isFramesReady,
    isRetrying,
    error
  } = usePayment({
    planId,
    onPaymentComplete
  });

  const [isInitializing, setIsInitializing] = useState(true);
  const [isMasterFrameLoaded, setIsMasterFrameLoaded] = useState(false);

  useEffect(() => {
    const masterFrame = masterFrameRef.current;
    if (!masterFrame) return;

    const handleMasterLoad = () => {
      console.log('Master frame loaded');
      setIsMasterFrameLoaded(true);
    };

    masterFrame.addEventListener('load', handleMasterLoad);
    return () => masterFrame.removeEventListener('load', handleMasterLoad);
  }, [masterFrameRef]);

  useEffect(() => {
    console.log("Initializing payment for plan:", planId);
    const initProcess = async () => {
      setIsInitializing(true);
      await initializePayment();
      setIsInitializing(false);
    };
    
    initProcess();
  }, []); // Run only once on mount
  
  useEffect(() => {
    if (paymentStatus === PaymentStatus.IDLE) {
      setIsSubmitting(false);
    }
  }, [paymentStatus]);
  
  const getButtonText = () => {
    if (isRetrying) {
      return <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />מאתחל...</span>;
    }
    
    if (isSubmitting || paymentStatus === PaymentStatus.PROCESSING) {
      return operationType === 'token_only' 
        ? <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מפעיל מנוי...</span>
        : <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד תשלום...</span>;
    }
    
    return operationType === 'token_only' ? 'אשר והפעל מנוי' : 'אשר תשלום';
  };

  const handleSubmitPayment = () => {
    const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value;
    const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value;
    
    if (!cardholderName) {
      toast.error('יש למלא את שם בעל הכרטיס');
      return;
    }

    if (!cardOwnerId || !/^\d{9}$/.test(cardOwnerId)) {
      toast.error('יש למלא תעודת זהות תקינה');
      return;
    }

    const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value;
    if (!email) {
      toast.error('יש למלא כתובת דואר אלקטרוני');
      return;
    }

    const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value;
    if (!phone) {
      toast.error('יש למלא מספר טלפון');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      submitPayment();
      
      setTimeout(() => {
        if (paymentStatus !== PaymentStatus.SUCCESS && paymentStatus !== PaymentStatus.PROCESSING) {
          setIsSubmitting(false);
        }
      }, 15000); // Add a timeout to reset button if no response after 15 seconds
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('אירעה שגיאה בשליחת התשלום');
      setIsSubmitting(false);
    }
  };

  const handleTimeout = () => {
    handleRetry();
  };

  usePaymentTimeout({
    paymentStatus,
    onTimeout: handleTimeout
  });

  const isContentReady = !isInitializing && 
    terminalNumber && 
    cardcomUrl && 
    lowProfileCode && 
    sessionId && 
    isMasterFrameLoaded && 
    isFramesReady &&
    paymentStatus !== PaymentStatus.INITIALIZING;

  const needsRetry = paymentStatus === PaymentStatus.FAILED;

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>
          {paymentStatus === PaymentStatus.SUCCESS 
            ? operationType === 'token_only'
              ? 'המנוי הופעל בהצלחה!'
              : 'התשלום בוצע בהצלחה!'
            : operationType === 'token_only'
              ? 'הזן את פרטי כרטיס האשראי שלך להפעלת המנוי'
              : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <iframe
          ref={masterFrameRef}
          id="CardComMasterFrame"
          name="CardComMasterFrame"
          src={`${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`}
          style={{ display: 'block', width: '0px', height: '0px', border: 'none' }}
          title="CardCom Master Frame"
        />
        
        {isInitializing || isRetrying ? (
          <InitializingPayment />
        ) : (
          <PaymentContent
            paymentStatus={paymentStatus}
            plan={plan}
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            masterFrameRef={masterFrameRef}
            onNavigateToDashboard={() => window.location.href = '/dashboard'}
            onRetry={handleRetry}
            operationType={operationType}
            isReady={isContentReady}
          />
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {paymentStatus === PaymentStatus.FAILED && (
          <Button 
            type="button" 
            className="w-full flex items-center justify-center"
            variant="outline"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRetrying ? 'מאתחל מחדש...' : 'נסה שנית'}
          </Button>
        )}
        
        {(paymentStatus === PaymentStatus.IDLE || paymentStatus === PaymentStatus.PROCESSING) && !isInitializing && (
          <>
            <Button 
              type="button" 
              className="w-full" 
              onClick={handleSubmitPayment}
              disabled={isSubmitting || paymentStatus === PaymentStatus.PROCESSING || !isContentReady}
            >
              {getButtonText()}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {operationType === 'token_only' 
                ? 'החיוב הראשון יבוצע בתום תקופת הניסיון' 
                : plan.hasTrial 
                  ? 'לא יבוצע חיוב במהלך תקופת הניסיון' 
                  : 'החיוב יבוצע מיידית'}
            </p>
          </>
        )}
        
        {onBack && paymentStatus !== PaymentStatus.SUCCESS && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="absolute top-4 right-4"
            disabled={isSubmitting || paymentStatus === PaymentStatus.PROCESSING || isRetrying}
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
