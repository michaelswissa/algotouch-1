
import { useState, useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { PlanType } from '@/types/payment';
import { toast } from 'sonner';

interface UsePaymentInitProps {
  planId: PlanType;
  initializePayment: (planId: PlanType) => Promise<any>;
  initializeCardcomFields: (masterFrameRef: any, lowProfileCode: string, sessionId: string, terminalNumber: string, operationType: any) => Promise<boolean>;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  operationType: 'payment' | 'token_only';
  setState: (updater: any) => void;
}

export const usePaymentInit = ({ 
  planId,
  initializePayment,
  initializeCardcomFields,
  masterFrameRef,
  operationType,
  setState
}: UsePaymentInitProps) => {
  const [initialized, setInitialized] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const maxInitAttempts = 3; // Maximum number of initialization attempts

  useEffect(() => {
    const init = async () => {
      // Check if we've already tried too many times
      if (initAttempts >= maxInitAttempts) {
        console.error(`Max initialization attempts (${maxInitAttempts}) reached`);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        toast.error('לא ניתן לאתחל את התשלום לאחר מספר ניסיונות');
        return;
      }

      // Check if a session already exists in localStorage
      try {
        const sessionData = localStorage.getItem('payment_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.planId === planId && session.status === 'initiated' && new Date(session.expires_at) > new Date()) {
            console.log('Reusing existing payment session:', session);
            setInitialized(true);
            setState(prev => ({ 
              ...prev, 
              paymentStatus: PaymentStatus.IDLE,
              lowProfileCode: session.lowProfileCode,
              sessionId: session.sessionId,
              terminalNumber: session.terminalNumber
            }));
            
            // Initialize CardCom fields with the existing session
            setTimeout(async () => {
              try {
                const initialized = await initializeCardcomFields(
                  masterFrameRef, 
                  session.lowProfileCode, 
                  session.sessionId,
                  session.terminalNumber,
                  operationType
                );
                
                if (!initialized) {
                  throw new Error('שגיאה באתחול שדות התשלום');
                }
                
                console.log('CardCom fields initialized successfully with existing session');
              } catch (error) {
                console.error('Error during CardCom field initialization with existing session:', error);
                setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
                toast.error(error.message || 'שגיאה באתחול שדות התשלום');
                
                // Remove invalid session
                localStorage.removeItem('payment_session');
                
                // Increment attempt count and try again if under max attempts
                setInitAttempts(prev => prev + 1);
              }
            }, 500);
            
            return;
          } else if (session.submitted === true) {
            console.log('Payment already submitted, not reinitializing');
            setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
            return;
          } else {
            // Session is invalid or expired
            console.log('Removing invalid or expired session');
            localStorage.removeItem('payment_session');
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        localStorage.removeItem('payment_session');
      }

      // No valid session, initialize a new one
      setInitAttempts(prev => prev + 1);
      const result = await initializePayment(planId);
      if (result) {
        setInitialized(true);
        setState(prev => ({ ...prev, paymentStatus: PaymentStatus.INITIALIZING }));
        
        try {
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.IDLE }));
          
          console.log('Setting up to initialize CardCom fields');
          setTimeout(async () => {
            try {
              const initialized = await initializeCardcomFields(
                masterFrameRef, 
                result.lowProfileCode, 
                result.sessionId,
                result.terminalNumber,
                operationType
              );
              
              if (!initialized) {
                throw new Error('שגיאה באתחול שדות התשלום');
              }
              
              console.log('CardCom fields initialized successfully');
            } catch (error) {
              console.error('Error during CardCom field initialization:', error);
              setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
              toast.error(error.message || 'שגיאה באתחול שדות התשלום');
              
              // Remove invalid session
              localStorage.removeItem('payment_session');
            }
          }, 500);
          
          return result;
        } catch (error) {
          console.error('Payment initialization error:', error);
          toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          localStorage.removeItem('payment_session');
          return null;
        }
      }
    };
    
    init();
  }, [planId, initializePayment, initializeCardcomFields, operationType, masterFrameRef, setState, initAttempts]);

  return { initialized };
};
