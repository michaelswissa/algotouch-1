import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PaymentContent from './PaymentContent';
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
  const masterFrameRef = useRef<HTMLIFrameElement>(null);

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

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
    if (paymentStatus === PaymentStatus.PROCESSING || paymentStatus === PaymentStatus.INITIALIZING) {
      return;
    }
    
    try {
      setPaymentStatus(PaymentStatus.INITIALIZING);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('אנא התח��ר לחשבונך כדי להמשיך');
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
        
        <PaymentContent
          paymentStatus={paymentStatus}
          plan={plan}
          terminalNumber={terminalNumber}
          cardcomUrl="https://secure.cardcom.solutions"
          masterFrameRef={masterFrameRef}
          onNavigateToDashboard={() => navigate('/dashboard')}
          onRetry={handleRetry}
        />
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
