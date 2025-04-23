
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const statusCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusCheckCountRef = useRef<number>(0);
  const maxStatusCheckAttempts = 20;
  const statusCheckIntervalMs = 3000;
  
  const checkPaymentStatus = useCallback(async (
    lowProfileCode: string, 
    sessionId: string,
    operationType?: 'payment' | 'token_only',
    planType?: string
  ) => {
    if (!lowProfileCode || !sessionId) {
      console.error("Missing required parameters for status check:", { 
        hasLowProfileCode: Boolean(lowProfileCode), 
        hasSessionId: Boolean(sessionId) 
      });
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.FAILED,
        isSubmitting: false
      }));
      return;
    }
    
    try {
      statusCheckCountRef.current += 1;
      console.log('Checking payment status:', { 
        lowProfileCode, 
        sessionId, 
        attempt: statusCheckCountRef.current,
        operationType,
        planType
      });
      
      // Call the endpoint to check the transaction status
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode,
          sessionId,
          operationType,
          planType
        }
      });
      
      if (error) {
        console.error('Error checking payment status:', error);
        if (statusCheckCountRef.current > 3) {
          setState(prev => ({ 
            ...prev, 
            paymentStatus: PaymentStatus.FAILED,
            isSubmitting: false
          }));
          toast.error('שגיאה בבדיקת סטטוס התשלום');
          clearStatusCheckTimer();
        } else {
          scheduleNextCheck(lowProfileCode, sessionId, operationType, planType);
        }
        return;
      }
      
      console.log('Payment status check response:', data);
      
      // Handle successful payment (both regular payment and token creation)
      if (data?.success) {
        console.log('Payment successful:', data);
        
        // For monthly plan with token_only operation, check if we need to process the initial charge
        if (planType === 'monthly' && operationType === 'token_only' && data.data?.token) {
          console.log('Token created successfully, processing initial subscription');
          
          // Call the recurring payment setup for monthly plan
          const { data: recurringData, error: recurringError } = await supabase.functions.invoke('cardcom-recurring', {
            body: {
              action: 'setup',
              token: data.data.token,
              planType: 'monthly',
              tokenExpiryDate: data.data.tokenExpiryDate,
              lastFourDigits: data.data.lastFourDigits
            }
          });
          
          if (recurringError || !recurringData?.success) {
            console.error('Error setting up recurring payment:', recurringError || recurringData?.message);
            setState(prev => ({ 
              ...prev, 
              paymentStatus: PaymentStatus.FAILED,
              isSubmitting: false
            }));
            toast.error('שגיאה בהגדרת תשלום מחזורי');
            clearStatusCheckTimer();
            return;
          }
          
          console.log('Recurring payment set up successfully:', recurringData);
        } 
        // For annual plan, set up recurring payment for next year if token was created
        else if (planType === 'annual' && data.data?.token) {
          console.log('Annual payment successful, setting up renewal for next year');
          
          const { data: recurringData, error: recurringError } = await supabase.functions.invoke('cardcom-recurring', {
            body: {
              action: 'setup',
              token: data.data.token,
              planType: 'annual',
              tokenExpiryDate: data.data.tokenExpiryDate,
              lastFourDigits: data.data.lastFourDigits,
              nextChargeDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
            }
          });
          
          if (recurringError) {
            console.error('Error setting up annual renewal:', recurringError);
            // Continue with success but log the error - renewal can be set up later
          }
        }
        
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          isSubmitting: false,
          transactionId: data.data?.transactionId || null,
          tokenId: data.data?.token || null
        }));
        
        toast.success(operationType === 'token_only' ? 
          'אמצעי התשלום נשמר בהצלחה!' : 'התשלום בוצע בהצלחה!');
        clearStatusCheckTimer();
        return;
      }
      
      // Handle failed payment
      if (data?.failed) {
        console.error('Payment failed:', data);
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          isSubmitting: false
        }));
        toast.error(data.message || 'התשלום נכשל');
        clearStatusCheckTimer();
        return;
      }
      
      // Handle payment still processing
      if (data?.processing) {
        console.log('Payment still processing...');
        if (hasExceededMaxAttempts()) {
          handleTimeout(operationType, planType);
          return;
        }
        scheduleNextCheck(lowProfileCode, sessionId, operationType, planType);
      }
    } catch (error) {
      console.error('Exception checking payment status:', error);
      if (statusCheckCountRef.current > 3) {
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          isSubmitting: false 
        }));
        toast.error('אירעה שגיאה בבדיקת סטטוס התשלום');
        clearStatusCheckTimer();
      } else {
        scheduleNextCheck(lowProfileCode, sessionId, operationType, planType);
      }
    }
  }, [setState]);
  
  const hasExceededMaxAttempts = () => {
    return statusCheckCountRef.current >= maxStatusCheckAttempts;
  };
  
  const handleTimeout = (operationType?: string, planType?: string) => {
    console.log(`Payment processing timeout exceeded for ${operationType} in plan ${planType}`);
    
    let errorMessage = 'תהליך התשלום לקח יותר מדי זמן. אנא נסה שנית.';
    
    if (operationType === 'token_only') {
      if (planType === 'monthly') {
        errorMessage = 'תהליך הגדרת המנוי החודשי לקח יותר מדי זמן. אנא נסה שנית.';
      } else {
        errorMessage = 'תהליך שמירת אמצעי התשלום לקח יותר מדי זמן. אנא נסה שנית.';
      }
    } else if (planType === 'annual') {
      errorMessage = 'תהליך התשלום השנתי לקח יותר מדי זמן. אנא נסה שנית.';
    } else if (planType === 'vip') {
      errorMessage = 'תהליך התשלום החד פעמי לקח יותר מדי זמן. אנא נסה שנית.';
    }
    
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.FAILED,
      isSubmitting: false 
    }));
    toast.error(errorMessage);
    clearStatusCheckTimer();
  };
  
  const scheduleNextCheck = (
    lowProfileCode: string, 
    sessionId: string,
    operationType?: 'payment' | 'token_only',
    planType?: string
  ) => {
    statusCheckTimerRef.current = setTimeout(() => {
      checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
    }, statusCheckIntervalMs);
  };
  
  const clearStatusCheckTimer = useCallback(() => {
    if (statusCheckTimerRef.current) {
      clearTimeout(statusCheckTimerRef.current);
      statusCheckTimerRef.current = null;
    }
  }, []);
  
  const startStatusCheck = useCallback((
    lowProfileCode: string, 
    sessionId: string,
    operationType?: 'payment' | 'token_only',
    planType?: string
  ) => {
    clearStatusCheckTimer();
    statusCheckCountRef.current = 0;
    setState(prev => ({ ...prev, paymentStatus: PaymentStatus.PROCESSING }));
    
    statusCheckTimerRef.current = setTimeout(() => {
      checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
    }, 2000);
  }, [setState, checkPaymentStatus, clearStatusCheckTimer]);
  
  const cleanupStatusCheck = useCallback(() => {
    clearStatusCheckTimer();
    statusCheckCountRef.current = 0;
  }, [clearStatusCheckTimer]);
  
  return { startStatusCheck, checkPaymentStatus, cleanupStatusCheck };
};
