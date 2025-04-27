import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import PaymentContent from './PaymentContent';
import { usePayment } from '@/hooks/usePayment';
import { PaymentStatus } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';
import InitializingPayment from './states/InitializingPayment';
import { usePaymentFlow } from '@/hooks/usePaymentFlow';
import { PlanType } from '@/types/payment';
import { useCardcomInitializer } from '@/hooks/useCardcomInitializer';
import { usePaymentStatus } from '@/hooks/payment/usePaymentStatus';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: (transactionId?: string) => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const { isInitializing, initializePayment } = usePaymentFlow();
  const [initialized, setInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { initializeCardcomFields } = useCardcomInitializer();
  const { setStatus: setPaymentStatus } = usePaymentStatus();
  
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
    handleRetry,
    submitPayment,
    lowProfileCode,
    sessionId,
    transactionId
  } = usePayment({
    planId,
    onPaymentComplete: (id?: string) => onPaymentComplete(id)
  });

  const [isMasterFrameLoaded, setIsMasterFrameLoaded] = useState(false);

  // Monitor when master frame is loaded
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
    const init = async () => {
      const result = await initializePayment(planId as PlanType);
      if (result) {
        setInitialized(true);
        setPaymentStatus(PaymentStatus.INITIALIZING);
        
        try {
          setPaymentStatus(PaymentStatus.IDLE);
          
          console.log('Setting up to initialize CardCom fields');
          setTimeout(async () => {
            console.log('Starting CardCom fields initialization');
            try {
              const initialized = await initializeCardcomFields(
                masterFrameRef, 
                result.lowProfileCode, 
                result.sessionId,
                result.terminalNumber,
                operationType
              );
              
              if (!initialized) {
                console.error("Failed to initialize CardCom fields");
                throw new Error('שגיאה באתחול שדות התשלום');
              }
              
              console.log('CardCom fields initialized successfully');
            } catch (error) {
              console.error('Error during CardCom field initialization:', error);
              setPaymentStatus(PaymentStatus.FAILED);
              toast.error(error.message || 'שגיאה באתחול שדות התשלום');
            }
          }, 500);
          
          return result;
        } catch (error) {
          console.error('Payment initialization error:', error);
          toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
          setPaymentStatus(PaymentStatus.FAILED);
          return null;
        }
      }
    };
    
    init();
  }, [planId, initializePayment, initializeCardcomFields, operationType, masterFrameRef, setPaymentStatus]);

  // When payment is successful, call onPaymentComplete with transactionId
  useEffect(() => {
    if (paymentStatus === PaymentStatus.SUCCESS && transactionId) {
      onPaymentComplete(transactionId);
    }
  }, [paymentStatus, transactionId, onPaymentComplete]);
  
  const getButtonText = () => {
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
        setIsSubmitting(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('אירעה שגיאה בשליחת התשלום');
      setIsSubmitting(false);
    }
  };

  // Determine if the iframe content is ready to be shown
  const isContentReady = !isInitializing && 
    terminalNumber && 
    cardcomUrl && 
    lowProfileCode && 
    sessionId && 
    isMasterFrameLoaded && 
    paymentStatus !== PaymentStatus.INITIALIZING;

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>
            {planId === 'monthly' ? 'הפעלת תקופת ניסיון'
              : planId === 'annual' ? 'רכישת מנוי שנתי'
              : 'רכישת מנוי VIP'}
          </CardTitle>
        </div>
        <CardDescription>
          {planId === 'monthly' 
            ? 'הזן את פרטי כרטיס האשראי שלך להפעלת תקופת הניסיון' 
            : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Master iframe is always loaded but hidden */}
        <iframe
          ref={masterFrameRef}
          id="CardComMasterFrame"
          name="CardComMasterFrame"
          src={`${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`}
          style={{ display: 'block', width: '0px', height: '0px', border: 'none' }}
          title="CardCom Master Frame"
        />
        
        {isInitializing ? (
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
            disabled={isSubmitting || paymentStatus === PaymentStatus.PROCESSING}
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
