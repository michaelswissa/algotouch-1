
import { useState, useCallback, useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const [paymentChecks, setPaymentChecks] = useState<NodeJS.Timeout[]>([]);
  const [checkCount, setCheckCount] = useState(0);
  const MAX_CHECKS = 20; // מקסימום בדיקות לפני שמחליטים שיש טיימאאוט
  
  // ניקוי הבדיקה התקופתית
  const cleanupStatusCheck = useCallback(() => {
    paymentChecks.forEach(timeout => clearTimeout(timeout));
    setPaymentChecks([]);
    setCheckCount(0);
  }, [paymentChecks]);

  // ניקוי בעת סיום
  useEffect(() => {
    return () => cleanupStatusCheck();
  }, [cleanupStatusCheck]);

  // פונקציה לבדיקת סטטוס תשלום
  const checkPaymentStatus = useCallback(async (
    lowProfileCode: string, 
    sessionId: string,
    operationType: 'payment' | 'token_only' = 'payment',
    planType?: string
  ) => {
    if (checkCount >= MAX_CHECKS) {
      console.log('Maximum check count reached, stopping status checks');
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.FAILED,
        errorMessage: 'זמן ההמתנה לאישור התשלום הסתיים. אנא נסה שוב.'
      }));
      
      toast.error('זמן ההמתנה לאישור התשלום הסתיים, אנא נסה שוב או צור קשר עם התמיכה');
      cleanupStatusCheck();
      return;
    }
    
    setCheckCount(prev => prev + 1);
    
    try {
      console.log(`Checking payment status (attempt ${checkCount + 1})`, {
        lowProfileCode, 
        sessionId, 
        operationType,
        planType
      });
      
      // Call Supabase edge function to check payment status
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode,
          sessionId,
          timestamp: Date.now(),
          attempt: checkCount,
          operationType,
          planType,
          forceRefresh: checkCount % 3 === 0  // כל 3 בדיקות, נאלץ ריענון
        }
      });
      
      if (error) {
        console.error('Error checking payment status:', error);
        
        // Continue checking despite error
        const timeout = setTimeout(() => {
          checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
        }, 3000);
        
        setPaymentChecks(prev => [...prev, timeout]);
        return;
      }
      
      console.log('Payment status check response:', data);
      
      if (data.success) {
        console.log('Payment was successful');
        
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          transactionId: data.data.transactionId || data.data.token || `success-${Date.now()}`
        }));
        
        toast.success(operationType === 'token_only' 
          ? 'המנוי הופעל בהצלחה!' 
          : 'התשלום בוצע בהצלחה!');
        
        // ניקוי כל הבדיקות התלויות
        cleanupStatusCheck();
        return;
      } else if (data.failed) {
        console.log('Payment failed');
        
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          errorMessage: data.message || 'התשלום נכשל. אנא נסה שוב.'
        }));
        
        toast.error(data.message || 'התשלום נכשל. אנא נסה שוב.');
        
        // ניקוי כל הבדיקות התלויות
        cleanupStatusCheck();
        return;
      } else if (data.timeout) {
        console.log('Payment timed out');
        
        setState(prev => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.FAILED,
          errorMessage: 'זמן ההמתנה לאישור התשלום הסתיים. אנא נסה שוב.'
        }));
        
        toast.error('זמן ההמתנה לאישור התשלום הסתיים');
        
        // ניקוי כל הבדיקות התלויות
        cleanupStatusCheck();
        return;
      }
      
      // עדיין מעבד - המשך בדיקה
      const timeout = setTimeout(() => {
        checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
      }, 3000); // בדוק כל 3 שניות
      
      setPaymentChecks(prev => [...prev, timeout]);
      
    } catch (error) {
      console.error('Exception checking payment status:', error);
      
      // המשך בדיקה למרות השגיאה
      const timeout = setTimeout(() => {
        checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
      }, 3000);
      
      setPaymentChecks(prev => [...prev, timeout]);
    }
  }, [setState, cleanupStatusCheck, checkCount]);

  // פונקציה להתחלת בדיקת סטטוס
  const startStatusCheck = useCallback((
    lowProfileCode: string, 
    sessionId: string,
    operationType: 'payment' | 'token_only' = 'payment',
    planType?: string
  ) => {
    // ניקוי בדיקות קודמות אם קיימות
    cleanupStatusCheck();
    
    console.log('Starting payment status check for', {
      lowProfileCode,
      sessionId,
      operationType,
      planType
    });
    
    // התחל בדיקה מיידית
    checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
  }, [checkPaymentStatus, cleanupStatusCheck]);

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
