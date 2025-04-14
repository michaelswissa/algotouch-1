import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentStatus } from '@/components/payment/types/payment';

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
      // Get registration data if available
      const registrationData = sessionStorage.getItem('registration_data');
      let userData = null;
      
      // Check for authenticated user first
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user && !registrationData) {
        toast.error('אנא התחבר לחשבונך כדי להמשיך');
        navigate('/auth');
        return;
      }

      // Use registration data if available, otherwise use authenticated user data
      if (registrationData) {
        userData = JSON.parse(registrationData);
      }

      const paymentUser = {
        email: user?.email || userData?.email,
        fullName: user?.user_metadata?.full_name || 
                 `${userData?.userData?.firstName || ''} ${userData?.userData?.lastName || ''}`.trim()
      };

      if (!paymentUser.email) {
        throw new Error('Missing user email');
      }

      // Get contract data
      const contractData = sessionStorage.getItem('contract_data');
      const contractDetails = contractData ? JSON.parse(contractData) : null;

      if (!contractDetails) {
        toast.error('נדרשת חתימה על החוזה');
        navigate('/subscription');
        return;
      }

      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: planId === 'monthly' ? 371 : planId === 'annual' ? 3371 : 13121,
          invoiceInfo: {
            fullName: paymentUser.fullName || paymentUser.email,
            email: paymentUser.email,
          },
          currency: "ILS",
          operation: "ChargeAndCreateToken",
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          registrationData: userData // Pass registration data if available
        }
      });
      
      if (error || !data?.success) {
        throw new Error(error?.message || data?.message || 'אירעה שגיאה באתחול התשלום');
      }
      
      setState(prev => ({
        ...prev,
        sessionId: data.data.sessionId,
        lowProfileCode: data.data.lowProfileCode,
        terminalNumber: data.data.terminalNumber,
        cardcomUrl: 'https://secure.cardcom.solutions',
        paymentStatus: PaymentStatus.PROCESSING
      }));
      
      // Initialize CardCom fields
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
        
        masterFrameRef.current.contentWindow.postMessage(
          initMessage,
          'https://secure.cardcom.solutions'
        );
      }
      
      return { 
        lowProfileCode: data.data.lowProfileCode, 
        sessionId: data.data.sessionId 
      };
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
    }
  };

  return { initializePayment };
};
