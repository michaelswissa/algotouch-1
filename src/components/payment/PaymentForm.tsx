
import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import PaymentContent from './PaymentContent';
import { usePayment } from '@/hooks/usePayment';
import { PaymentStatus, PaymentStatusType } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import InitializingPayment from './states/InitializingPayment';
import { usePaymentFlow } from '@/hooks/usePaymentFlow';
import { PlanType } from '@/types/payment';
import { useCardcomInitializer } from '@/hooks/useCardcomInitializer';
import { usePaymentStatus } from '@/hooks/payment/usePaymentStatus';
import { usePaymentInit } from '@/hooks/payment/usePaymentInit';
import { usePaymentSubmission } from '@/hooks/payment/usePaymentSubmission';
import PaymentHeader from './PaymentHeader';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: (transactionId?: string) => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const { isInitializing, initializePayment } = usePaymentFlow();
  const { initializeCardcomFields } = useCardcomInitializer();
  const { setState } = usePaymentStatus({ onPaymentComplete });
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Determine the operation type based on plan
  const getOperationType = (planType: string): 'payment' | 'token_only' => {
    if (planType === 'monthly') {
      return 'token_only'; // Monthly plan only creates token
    }
    return 'payment'; // Annual and VIP charge immediately
  };

  const operationType = getOperationType(planId);

  const {
    terminalNumber,
    cardcomUrl,
    paymentStatus,
    handleRetry,
    submitPayment,
    lowProfileCode,
    sessionId,
    transactionId
  } = usePayment({
    planId,
    onPaymentComplete: (id?: string) => onPaymentComplete(id)
  });

  // Initialize payment
  const { initialized } = usePaymentInit({
    planId: planId as PlanType,
    initializePayment,
    initializeCardcomFields,
    masterFrameRef,
    operationType,
    setState
  });

  // Handle payment submission
  const { isSubmitting, hasSubmitted, handleSubmitPayment } = usePaymentSubmission({
    submitPayment,
    setState,
    lowProfileCode,
    planId
  });

  // When payment is successful, call onPaymentComplete with transactionId
  useEffect(() => {
    if (paymentStatus === PaymentStatus.SUCCESS && transactionId) {
      onPaymentComplete(transactionId);
      
      // Clear payment session from localStorage on success
      localStorage.removeItem('payment_session');
    }
  }, [paymentStatus, transactionId, onPaymentComplete]);

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

  const getButtonText = () => {
    if (isSubmitting || paymentStatus === PaymentStatus.PROCESSING) {
      return operationType === 'token_only' 
        ? <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מפעיל מנוי...</span>
        : <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד תשלום...</span>;
    }
    return operationType === 'token_only' ? 'אשר והפעל מנוי' : 'אשר תשלום';
  };

  // Get description text based on plan type
  const getDescriptionText = () => {
    if (planId === 'monthly') {
      return 'החיוב הראשון יבוצע בתום תקופת הניסיון של 30 יום';
    } else if (planId === 'annual') {
      return 'חיוב שנתי חד פעמי, החיוב הבא יתבצע בעוד שנה';
    } else { // VIP
      return 'חיוב חד פעמי, ללא חיובים נוספים בעתיד';
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
      <PaymentHeader planId={planId as PlanType} />
      
      <CardContent className="space-y-4">
        {/* Master iframe */}
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
              disabled={isSubmitting || paymentStatus === PaymentStatus.PROCESSING || !isContentReady || hasSubmitted}
            >
              {getButtonText()}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {getDescriptionText()}
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
