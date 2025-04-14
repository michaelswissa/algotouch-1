import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import { getSubscriptionPlans, PaymentStatus, PaymentStatusType } from './utils/paymentHelpers';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ 
  planId, 
  onPaymentComplete, 
  onBack 
}) => {
  const navigate = useNavigate();
  const [terminalNumber, setTerminalNumber] = useState<string>('');
  const [cardcomUrl, setCardcomUrl] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>(PaymentStatus.IDLE);
  const [sessionId, setSessionId] = useState<string>('');
  const [lowProfileCode, setLowProfileCode] = useState<string>('');
  const statusCheckTimerRef = useRef<number | null>(null);

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const masterFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `${cardcomUrl}/External/OpenFields/3DS.js?v=${Date.now()}`;
    document.head.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [cardcomUrl]);

  const handlePaymentSuccess = (data: any) => {
    console.log('Payment successful:', data);
    setPaymentStatus(PaymentStatus.SUCCESS);
    toast.success('התשלום בוצע בהצלחה!');
    
    checkPaymentStatus(lowProfileCode, sessionId);
    
    setTimeout(() => {
      onPaymentComplete();
    }, 1000);
  };

  const handleFrameMessages = (event: MessageEvent) => {
    if (!event.origin.includes('cardcom.solutions')) {
      return;
    }

    const msg = event.data;
    console.log('Received message from CardCom iframe:', msg);

    switch (msg.action) {
      case 'HandleSubmit':
        handlePaymentSuccess(msg.data);
        break;
      case '3DSProcessStarted':
        setPaymentStatus(PaymentStatus.PROCESSING);
        break;
      case '3DSProcessCompleted':
        checkPaymentStatus(lowProfileCode, sessionId);
        break;
      case 'HandleError':
        console.error('Payment error:', msg);
        setPaymentStatus(PaymentStatus.FAILED);
        toast.error(msg.message || 'אירעה שגיאה בעיבוד התשלום');
        break;
      case 'handleValidations':
        if (msg.field === 'cardNumber') {
          if (!msg.isValid && msg.message) {
            toast.error(msg.message);
          }
        }
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleFrameMessages);
    return () => window.removeEventListener('message', handleFrameMessages);
  }, [lowProfileCode, sessionId]);

  const initializePayment = async () => {
    if (
      paymentStatus === PaymentStatus.PROCESSING || 
      paymentStatus === PaymentStatus.INITIALIZING
    ) {
      return;
    }
    
    try {
      setPaymentStatus(PaymentStatus.INITIALIZING);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('אנא התחבר לחשבונך כדי להמשיך');
        navigate('/auth');
        return;
      }

      const planPrice = planId === 'monthly' 
        ? 371
        : planId === 'annual' 
          ? 3371 
          : 13121;

      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: planPrice,
          invoiceInfo: {
            fullName: user.user_metadata?.full_name || '',
            email: user.email || '',
          },
          currency: "ILS",
          operation: "ChargeAndCreateToken",
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          }
        }
      });
      
      if (error || !data?.success) {
        throw new Error(error?.message || data?.message || 'אירעה שגיאה באתחול התשלום');
      }
      
      console.log('Payment session created:', data);
      
      setSessionId(data.data.sessionId);
      setLowProfileCode(data.data.lowProfileCode);
      setTerminalNumber(data.data.terminalNumber);
      setCardcomUrl('https://secure.cardcom.solutions');
      setPaymentStatus(PaymentStatus.PROCESSING);
      
      if (masterFrameRef.current?.contentWindow) {
        const initMessage = {
          action: 'init',
          lowProfileCode: data.data.lowProfileCode,
          sessionId: data.data.sessionId,
          cardFieldCSS: `
            input {
              font-family: 'Assistant', sans-serif;
              font-size: 16px;
              text-align: right;
              direction: rtl;
              padding: 8px 12px;
              border-radius: 4px;
              border: 1px solid #ccc;
              width: 100%;
              box-sizing: border-box;
            }
            input:focus {
              border-color: #3b82f6;
              outline: none;
              box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
            }
            .invalid { 
              border: 2px solid #ef4444; 
              box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
            }
          `,
          cvvFieldCSS: `
            input {
              font-family: 'Assistant', sans-serif;
              font-size: 16px;
              text-align: center;
              padding: 8px 12px;
              border-radius: 4px;
              border: 1px solid #ccc;
              width: 100%;
              box-sizing: border-box;
            }
            input:focus {
              border-color: #3b82f6;
              outline: none;
              box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
            }
            .invalid { 
              border: 2px solid #ef4444;
              box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
            }
          `,
          language: "he"
        };
        
        masterFrameRef.current.contentWindow.postMessage(initMessage, 'https://secure.cardcom.solutions');
      }
      
      startStatusCheck(data.data.lowProfileCode, data.data.sessionId);
      
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setPaymentStatus(PaymentStatus.FAILED);
    }
  };

  const startStatusCheck = (lpCode: string, sId: string) => {
    setTimeout(() => {
      checkPaymentStatus(lpCode, sId);
      
      statusCheckTimerRef.current = window.setInterval(() => {
        checkPaymentStatus(lpCode, sId);
      }, 3000);
    }, 5000);
  };

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

  const handleRetry = () => {
    setPaymentStatus(PaymentStatus.IDLE);
    setSessionId('');
    setLowProfileCode('');
    
    setTimeout(() => {
      initializePayment();
    }, 500);
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
        <iframe
          ref={masterFrameRef}
          id="CardComMasterFrame"
          name="CardComMasterFrame"
          src={`https://secure.cardcom.solutions/External/openFields/master.html?terminalnumber=${terminalNumber}&rtl=true`}
          style={{ display: 'none' }}
          title="CardCom Master Frame"
        />
        
        <PlanSummary 
          planName={plan.name} 
          planId={plan.id}
          price={plan.price}
          displayPrice={plan.displayPrice}
          description={plan.description} 
          hasTrial={plan.hasTrial}
          freeTrialDays={plan.freeTrialDays}
        />
        
        {paymentStatus === PaymentStatus.IDLE && (
          <PaymentDetails 
            terminalNumber={terminalNumber}
            cardcomUrl={"https://secure.cardcom.solutions"}
            masterFrameRef={masterFrameRef}
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
            >
              {paymentStatus === PaymentStatus.INITIALIZING ? (
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
        
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="absolute top-4 right-4"
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
