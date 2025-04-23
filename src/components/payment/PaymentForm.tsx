import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { PaymentProgress } from './PaymentProgress';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const formReadyRef = useRef(false);
  
  // Load plan details
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Use our payment hook with enhanced state management
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
    error,
    paymentStatusCheck
  } = usePayment({
    planId,
    onPaymentComplete
  });

  // Track initialization state
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMasterFrameLoaded, setIsMasterFrameLoaded] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Monitor master frame loading
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

  // Enhanced timeout handling with multiple stages
  const handleTimeout = useCallback(() => {
    console.log('Payment timeout triggered, checking status again');
    if (paymentStatusCheck && lowProfileCode && sessionId && operationType) {
      paymentStatusCheck.checkPaymentStatus(lowProfileCode, sessionId, operationType)
        .catch(console.error);
    }
  }, [paymentStatusCheck, lowProfileCode, sessionId, operationType]);

  const handleFinalTimeout = useCallback(() => {
    console.log('Final payment timeout triggered, attempting recovery');
    handleRetry();
  }, [handleRetry]);

  const { timeoutStage } = usePaymentTimeout({
    paymentStatus,
    onTimeout: handleTimeout,
    onFinalTimeout: handleFinalTimeout
  });

  // FSM-based initialization process with retry capability
  const initializePaymentProcess = useCallback(async () => {
    setIsInitializing(true);
    setInitializationError(null);
    
    try {
      console.log(`Initializing payment for plan: ${planId} (attempt ${initializationAttempts + 1})`);
      const result = await initializePayment(initializationAttempts > 0);
      
      if (!result) {
        throw new Error('אתחול תהליך התשלום נכשל');
      }
      
      console.log('Payment initialization successful');
      formReadyRef.current = true;
    } catch (error) {
      console.error('Payment initialization error:', error);
      setInitializationError(error instanceof Error ? error.message : 'שגיאה באתחול תהליך התשלום');
      
      // Auto-retry once on failure
      if (initializationAttempts < 1) {
        console.log('Auto-retrying payment initialization');
        setInitializationAttempts(prev => prev + 1);
        setTimeout(() => initializePaymentProcess(), 1000);
        return;
      }
    } finally {
      setIsInitializing(false);
    }
  }, [planId, initializePayment, initializationAttempts]);

  // Initial payment setup
  useEffect(() => {
    initializePaymentProcess();
  }, [initializePaymentProcess]);
  
  // Reset submission state based on payment status
  useEffect(() => {
    if (paymentStatus === PaymentStatus.IDLE) {
      setIsSubmitting(false);
    }
  }, [paymentStatus]);
  
  // Determine button text based on current state
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
    // Get form values
    const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value;
    const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value;
    const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value;
    const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value;
    
    // Form validation
    if (!cardholderName) {
      toast.error('יש למלא את שם בעל הכרטיס');
      return;
    }

    if (!cardOwnerId || !/^\d{9}$/.test(cardOwnerId)) {
      toast.error('יש למלא תעודת זהות תקינה');
      return;
    }

    if (!email) {
      toast.error('יש למלא כתובת דואר אלקטרוני');
      return;
    }

    if (!phone) {
      toast.error('יש למלא מספר טלפון');
      return;
    }
    
    // Set submitting state
    setIsSubmitting(true);
    
    try {
      // Submit payment through our hook
      submitPayment();
      
      // Safety timeout to reset UI if no response
      const safetyTimeout = setTimeout(() => {
        if (paymentStatus !== PaymentStatus.SUCCESS && paymentStatus !== PaymentStatus.PROCESSING) {
          toast.warning('לא התקבלה תגובה מהשרת, נסה שנית');
        }
      }, 15000);
      
      // Clean up safety timeout
      return () => clearTimeout(safetyTimeout);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('אירעה שגיאה בשליחת התשלום');
      setIsSubmitting(false);
    }
  };

  // Check if content is ready to be displayed
  const isContentReady = !isInitializing && 
    terminalNumber && 
    cardcomUrl && 
    lowProfileCode && 
    sessionId && 
    isMasterFrameLoaded && 
    isFramesReady &&
    paymentStatus !== PaymentStatus.INITIALIZING;

  // Check if we need to retry due to failure
  const needsRetry = paymentStatus === PaymentStatus.FAILED || initializationError !== null;

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
        {/* Hidden iframe for CardCom master frame */}
        <iframe
          ref={masterFrameRef}
          id="CardComMasterFrame"
          name="CardComMasterFrame"
          src={`${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`}
          style={{ display: 'block', width: '0px', height: '0px', border: 'none' }}
          title="CardCom Master Frame"
        />
        
        {/* Show initialization loader or error */}
        {(isInitializing || isRetrying) && (
          <InitializingPayment error={initializationError} />
        )}
        
        {/* Show payment content when ready */}
        {!isInitializing && !isRetrying && (
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
        
        {/* Show progress component for processing state */}
        {paymentStatus === PaymentStatus.PROCESSING && paymentStatusCheck && (
          <PaymentProgress 
            status={paymentStatus} 
            attempt={paymentStatusCheck.currentAttempt}
            timeoutStage={timeoutStage}
            isRealtimeConnected={paymentStatusCheck.isRealtimeConnected}
          />
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {/* Show retry button for failed payments */}
        {needsRetry && (
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
        
        {/* Show submit button for idle or processing states */}
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
        
        {/* Show back button if provided and not in success state */}
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
