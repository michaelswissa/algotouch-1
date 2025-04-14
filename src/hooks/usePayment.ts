
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus, PaymentStatusType } from '@/components/payment/utils/paymentHelpers';
import { toast } from 'sonner';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete: () => void;
}

interface PaymentState {
  terminalNumber: string;
  cardcomUrl: string;
  paymentStatus: PaymentStatusType;
  sessionId: string;
  lowProfileCode: string;
}

export const usePayment = ({ planId, onPaymentComplete }: UsePaymentProps) => {
  const navigate = useNavigate();
  const [state, setState] = useState<PaymentState>({
    terminalNumber: '',
    cardcomUrl: '',
    paymentStatus: PaymentStatus.IDLE,
    sessionId: '',
    lowProfileCode: '',
  });
  
  const statusCheckTimerRef = useRef<number | null>(null);
  const masterFrameRef = useRef<HTMLIFrameElement>(null);

  const handlePaymentSuccess = (data: any) => {
    console.log('Payment successful:', data);
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.SUCCESS }));
    toast.success('התשלום בוצע בהצלחה!');
    
    checkPaymentStatus(state.lowProfileCode, state.sessionId);
    
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
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
        break;
      case '3DSProcessCompleted':
        checkPaymentStatus(state.lowProfileCode, state.sessionId);
        break;
      case 'HandleError':
        console.error('Payment error:', msg);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
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

  const initializePayment = async () => {
    if (state.paymentStatus === PaymentStatus.PROCESSING || 
        state.paymentStatus === PaymentStatus.INITIALIZING) {
      return;
    }
    
    try {
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.INITIALIZING }));
      
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
      
      setState(prev => ({
        ...prev,
        sessionId: data.data.sessionId,
        lowProfileCode: data.data.lowProfileCode,
        terminalNumber: data.data.terminalNumber,
        cardcomUrl: 'https://secure.cardcom.solutions',
        paymentStatus: PaymentStatus.PROCESSING
      }));
      
      startStatusCheck(data.data.lowProfileCode, data.data.sessionId);
      
      // Initialize CardCom fields if masterFrame is ready
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
      
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
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
        
        setState(prev => ({
          ...prev,
          paymentStatus: data.status === 'completed' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED
        }));
        
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
    setState(prev => ({
      ...prev,
      paymentStatus: PaymentStatus.IDLE,
      sessionId: '',
      lowProfileCode: ''
    }));
    
    setTimeout(() => {
      initializePayment();
    }, 500);
  };

  useEffect(() => {
    window.addEventListener('message', handleFrameMessages);
    return () => {
      window.removeEventListener('message', handleFrameMessages);
      if (statusCheckTimerRef.current) {
        window.clearInterval(statusCheckTimerRef.current);
      }
    };
  }, [state.lowProfileCode, state.sessionId]);

  return {
    ...state,
    masterFrameRef,
    initializePayment,
    handleRetry
  };
};
