
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { PaymentStatus, PaymentStatusType } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import SuccessfulPayment from './states/SuccessfulPayment';
import FailedPayment from './states/FailedPayment';
import InitializingPayment from './states/InitializingPayment';
import { initializeCardcomRedirect } from '@/lib/payment/cardcom-service';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>(PaymentStatus.IDLE);
  const [isInitializing, setIsInitializing] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const masterFrameRef = React.useRef<HTMLIFrameElement>(null);
  
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Initialize payment when component mounts
  useEffect(() => {
    const initPayment = async () => {
      setIsInitializing(true);
      try {
        // Get registration data from storage
        const registrationDataStr = sessionStorage.getItem('registration_data');
        const contractDataStr = sessionStorage.getItem('contract_data');
        let email = '';
        let fullName = '';
        
        // Try to get email and name from contract data first
        if (contractDataStr) {
          const contractData = JSON.parse(contractDataStr);
          email = contractData.email || '';
          fullName = contractData.fullName || '';
        } 
        // If not available, try registration data
        else if (registrationDataStr) {
          const regData = JSON.parse(registrationDataStr);
          email = regData.email || '';
          if (regData.userData) {
            const { firstName, lastName } = regData.userData;
            if (firstName && lastName) {
              fullName = `${firstName} ${lastName}`;
            }
          }
        }

        // Calculate amount based on plan
        let amount = 0;
        switch (planId) {
          case 'monthly':
            amount = 371;
            break;
          case 'annual':
            amount = 3371;
            break;
          case 'vip':
            amount = 13121;
            break;
          default:
            throw new Error(`Unsupported plan: ${planId}`);
        }

        // Initialize direct CardCom payment
        const response = await initializeCardcomRedirect({
          planId,
          amount,
          userEmail: email,
          fullName,
        });

        console.log('Payment redirect initialized:', response);
        
        // Store the redirect URL
        setRedirectUrl(response.url);
        
        // Store payment reference in session storage
        sessionStorage.setItem('payment_data', JSON.stringify({
          reference: response.reference,
          lowProfileCode: response.lowProfileCode,
          planId,
          timestamp: new Date().toISOString(),
          status: 'initialized'
        }));

      } catch (error) {
        console.error('Error initializing payment:', error);
        toast.error(error instanceof Error ? error.message : 'שגיאה באתחול תשלום');
        setPaymentStatus(PaymentStatus.FAILED);
      } finally {
        setIsInitializing(false);
      }
    };

    initPayment();
  }, [planId]);

  // Check for iframe redirects (payment complete)
  useEffect(() => {
    const checkIframeStatus = () => {
      const iframe = masterFrameRef.current;
      
      if (!iframe || !iframe.contentWindow) return;
      
      try {
        const location = iframe.contentWindow.location.href;
        
        if (location.includes('/success')) {
          setPaymentStatus(PaymentStatus.SUCCESS);
          onPaymentComplete();
        } else if (location.includes('/failed')) {
          setPaymentStatus(PaymentStatus.FAILED);
        }
      } catch (e) {
        // Cross-origin error, can't access iframe location
        // This is normal during processing
      }
    };
    
    const interval = setInterval(checkIframeStatus, 1000);
    return () => clearInterval(interval);
  }, [onPaymentComplete]);

  const renderContent = () => {
    if (isInitializing) {
      return <InitializingPayment />;
    }
    
    if (paymentStatus === PaymentStatus.SUCCESS) {
      return <SuccessfulPayment plan={plan} onContinue={() => window.location.href = '/dashboard'} />;
    }
    
    if (paymentStatus === PaymentStatus.FAILED) {
      return <FailedPayment onRetry={() => setPaymentStatus(PaymentStatus.IDLE)} />;
    }
    
    return (
      <>
        <PlanSummary 
          planName={plan.name} 
          planId={plan.id}
          price={plan.price}
          displayPrice={plan.displayPrice}
          description={plan.description} 
          hasTrial={plan.hasTrial}
          freeTrialDays={plan.freeTrialDays}
        />
        <PaymentDetails 
          paymentUrl={redirectUrl || ''}
          isReady={!isInitializing && !!redirectUrl}
          masterFrameRef={masterFrameRef}
        />
      </>
    );
  };

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>
          {paymentStatus === PaymentStatus.SUCCESS 
            ? 'התשלום בוצע בהצלחה!'
            : 'הזן את פרטי כרטיס האשראי שלך לתשלום'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {renderContent()}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {paymentStatus !== PaymentStatus.SUCCESS && 
         paymentStatus !== PaymentStatus.FAILED &&
         !isInitializing && (
          <p className="text-xs text-center text-muted-foreground">
            {plan.hasTrial 
              ? 'לא יבוצע חיוב במהלך תקופת הניסיון' 
              : 'החיוב יבוצע מיידית'}
          </p>
        )}
        
        {onBack && paymentStatus !== PaymentStatus.SUCCESS && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="absolute top-4 right-4"
            disabled={paymentStatus === PaymentStatus.PROCESSING}
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
