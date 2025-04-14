
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import { getSubscriptionPlans, PaymentStatus } from './utils/paymentHelpers';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete }) => {
  const navigate = useNavigate();
  const [terminalNumber, setTerminalNumber] = useState<string>('');
  const [cardcomUrl, setCardcomUrl] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.IDLE);
  const [sessionId, setSessionId] = useState<string>('');
  const [lowProfileCode, setLowProfileCode] = useState<string>('');
  const statusCheckTimerRef = useRef<number | null>(null);

  // Get subscription plan details
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  useEffect(() => {
    // Fetch CardCom terminal information from backend config
    const fetchConfig = async () => {
      try {
        const response = await fetch('/OpenFields-Backend-Node-main/config.json');
        const config = await response.json();
        setTerminalNumber(config.terminalNumber.toString());
        setCardcomUrl(config.cardcomUrl);
      } catch (error) {
        console.error('Error loading CardCom config:', error);
        toast.error('אירעה שגיאה בטעינת הגדרות התשלום');
      }
    };

    fetchConfig();
    
    // Cleanup function for status check timer
    return () => {
      if (statusCheckTimerRef.current) {
        window.clearInterval(statusCheckTimerRef.current);
      }
    };
  }, []);

  // Start the payment process
  const initializePayment = async () => {
    if (paymentStatus === PaymentStatus.PROCESSING || paymentStatus === PaymentStatus.INITIALIZING) {
      return; // Prevent multiple calls
    }
    
    try {
      setPaymentStatus(PaymentStatus.INITIALIZING);
      
      // Get user data from auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('אנא התחבר לחשבונך כדי להמשיך');
        navigate('/auth');
        return;
      }
      
      // Call the CardCom payment edge function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: plan.price,
          invoiceInfo: null, // Will be added after successful payment
          currency: "ILS"
        }
      });
      
      if (error || !data?.success) {
        throw new Error(error?.message || data?.message || 'אירעה שגיאה באתחול התשלום');
      }
      
      console.log('Payment session created:', data);
      
      setSessionId(data.data.sessionId);
      setLowProfileCode(data.data.lowProfileCode);
      setTerminalNumber(data.data.terminalNumber);
      setCardcomUrl(data.data.cardcomUrl);
      setPaymentStatus(PaymentStatus.PROCESSING);
      
      // Start polling for payment status
      startStatusCheck(data.data.lowProfileCode, data.data.sessionId);
      
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setPaymentStatus(PaymentStatus.FAILED);
    }
  };
  
  // Start checking payment status
  const startStatusCheck = (lpCode: string, sId: string) => {
    // First check after 5 seconds, then every 3 seconds
    setTimeout(() => {
      checkPaymentStatus(lpCode, sId);
      
      // Set interval for subsequent checks
      statusCheckTimerRef.current = window.setInterval(() => {
        checkPaymentStatus(lpCode, sId);
      }, 3000);
    }, 5000);
  };
  
  // Check payment status
  const checkPaymentStatus = async (lpCode: string, sId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode: lpCode,
          sessionId: sId
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log('Payment status check result:', data);
      
      // If payment status is final (completed or failed), stop checking
      if (data.status === 'completed' || data.status === 'failed') {
        if (statusCheckTimerRef.current) {
          window.clearInterval(statusCheckTimerRef.current);
          statusCheckTimerRef.current = null;
        }
        
        setPaymentStatus(data.status === 'completed' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED);
        
        if (data.status === 'completed') {
          toast.success('התשלום בוצע בהצלחה!');
          onPaymentComplete();
        } else {
          toast.error(data.message || 'התשלום נכשל');
        }
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
    }
  };
  
  // Retry payment after failure
  const handleRetry = () => {
    setPaymentStatus(PaymentStatus.IDLE);
    setSessionId('');
    setLowProfileCode('');
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
        <PlanSummary 
          planName={plan.name} 
          planId={plan.id}
          price={plan.price}
          displayPrice={plan.displayPrice}
          description={plan.description} 
          hasTrial={plan.hasTrial}
          freeTrialDays={plan.freeTrialDays}
        />
        
        {paymentStatus === PaymentStatus.IDLE && terminalNumber && cardcomUrl && (
          <PaymentDetails 
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
          />
        )}
        
        {paymentStatus === PaymentStatus.INITIALIZING && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>אנא המתן, מאתחל תהליך תשלום...</p>
          </div>
        )}
        
        {paymentStatus === PaymentStatus.PROCESSING && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>מעבד את התשלום, אנא המתן...</p>
            <p className="text-sm text-muted-foreground mt-2">אל תסגור את החלון זה</p>
          </div>
        )}
        
        {paymentStatus === PaymentStatus.SUCCESS && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">התשלום בוצע בהצלחה!</h3>
            <p className="text-muted-foreground">
              {plan.id === 'vip'
                ? 'המנוי שלך הופעל לכל החיים'
                : `המנוי שלך הופעל ויחודש אוטומטית בכל ${plan.id === 'monthly' ? 'חודש' : 'שנה'}`}
            </p>
          </div>
        )}
        
        {paymentStatus === PaymentStatus.FAILED && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">התשלום נכשל</h3>
            <p className="text-muted-foreground mb-4">
              אירעה שגיאה בעיבוד התשלום. אנא נסה שנית או פנה לתמיכה.
            </p>
            <Button variant="outline" onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              נסה שנית
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {paymentStatus === PaymentStatus.IDLE && (
          <>
            <Button 
              type="button" 
              className="w-full" 
              onClick={initializePayment}
              disabled={!terminalNumber || !cardcomUrl}
            >
              {!terminalNumber || !cardcomUrl ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> טוען...
                </span>
              ) : 'שלם עכשיו'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {plan.hasTrial ? 'לא יבוצע חיוב במהלך תקופת הניסיון' : 'החיוב יבוצע מיידית'}
            </p>
          </>
        )}
        
        {paymentStatus === PaymentStatus.SUCCESS && (
          <Button 
            type="button" 
            className="w-full" 
            onClick={() => navigate('/dashboard')}
          >
            המשך למערכת
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
