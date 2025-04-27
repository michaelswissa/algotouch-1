
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { PaymentStatus } from './types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { toast } from 'sonner';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import SuccessfulPayment from './states/SuccessfulPayment';
import FailedPayment from './states/FailedPayment';
import InitializingPayment from './states/InitializingPayment';
import { CardComRedirectService } from '@/services/payment/CardComRedirectService';
import { StorageService } from '@/services/storage/StorageService';
import { useAuth } from '@/contexts/auth';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const [paymentStatus, setPaymentStatus] = useState<typeof PaymentStatus[keyof typeof PaymentStatus]>(PaymentStatus.IDLE);
  const [isInitializing, setIsInitializing] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [lowProfileCode, setLowProfileCode] = useState<string>('');
  const { user } = useAuth();
  
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Initialize payment on mount
  useEffect(() => {
    initializePayment();
    
    // Cleanup on unmount
    return () => {
      setPaymentStatus(PaymentStatus.IDLE);
    };
  }, [planId]);

  const initializePayment = async () => {
    setIsInitializing(true);
    setPaymentStatus(PaymentStatus.INITIALIZING);
    
    try {
      // Get registration data
      const registrationData = StorageService.getRegistrationData();
      if (!registrationData || !registrationData.email) {
        toast.error('מידע הרשמה חסר או לא תקין');
        setPaymentStatus(PaymentStatus.FAILED);
        return;
      }
      
      // Prepare user information for the payment
      const fullName = `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim();
      const email = registrationData.email;
      
      // Calculate amount based on plan
      const amount = 
        planId === 'monthly' ? 371 :
        planId === 'annual' ? 3371 : 13121;
      
      // Initialize payment redirect
      const { url, lowProfileCode } = await CardComRedirectService.initializeRedirect({
        planId,
        amount,
        userEmail: email,
        fullName,
        userId: user?.id || registrationData.userId
      });
      
      // Store payment session information
      StorageService.updatePaymentData({
        lowProfileCode,
        status: 'pending'
      });
      
      // Set payment URL and code
      setPaymentUrl(url);
      setLowProfileCode(lowProfileCode);
      setPaymentStatus(PaymentStatus.IDLE);
      
    } catch (error) {
      console.error("Error initializing payment:", error);
      toast.error(error instanceof Error ? error.message : 'שגיאה באתחול התשלום');
      setPaymentStatus(PaymentStatus.FAILED);
    } finally {
      setIsInitializing(false);
    }
  };
  
  // Check for iframe redirects (payment complete)
  useEffect(() => {
    const checkIframeStatus = () => {
      const iframe = document.getElementById('cardcom-frame') as HTMLIFrameElement;
      
      if (!iframe || !iframe.contentWindow) return;
      
      try {
        // If we can access the iframe's location, check for success/failure paths
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
    
    // Check every second
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
      return <FailedPayment onRetry={() => initializePayment()} />;
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
          paymentUrl={paymentUrl}
          isReady={!isInitializing && !!paymentUrl}
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
