
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentStatus } from '@/components/payment/utils/paymentHelpers';

interface UsePaymentInitializationProps {
  planId: string;
  setState: (updater: any) => void;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
}

export const usePaymentInitialization = ({ 
  planId, 
  setState, 
  masterFrameRef 
}: UsePaymentInitializationProps) => {
  const navigate = useNavigate();

  const initializePayment = async () => {
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.INITIALIZING 
    }));
    
    try {
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
      
      // Initialize CardCom fields if masterFrame is ready
      if (masterFrameRef.current?.contentWindow) {
        initializeCardComFields(
          masterFrameRef.current.contentWindow,
          data.data.lowProfileCode,
          data.data.sessionId
        );
      }
      
      return { lowProfileCode: data.data.lowProfileCode, sessionId: data.data.sessionId };
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
    }
  };

  const initializeCardComFields = (
    contentWindow: Window,
    lowProfileCode: string,
    sessionId: string
  ) => {
    const initMessage = {
      action: 'init',
      lowProfileCode,
      sessionId,
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
    
    contentWindow.postMessage(initMessage, 'https://secure.cardcom.solutions');
  };

  return { initializePayment };
};
