
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

  useEffect(() => {
    const init = async () => {
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
            }
          }, 500);
          
          return result;
        } catch (error) {
          console.error('Payment initialization error:', error);
          toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
          return null;
        }
      }
    };
    
    init();
  }, [planId, initializePayment, initializeCardcomFields, operationType, masterFrameRef, setState]);

  return { initialized };
};
