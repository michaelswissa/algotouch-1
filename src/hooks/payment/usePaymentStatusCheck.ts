
import { useState, useCallback, useEffect } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  setState: (updater: any) => void;
}

export const usePaymentStatusCheck = ({ setState }: UsePaymentStatusCheckProps) => {
  const [paymentChecks, setPaymentChecks] = useState<NodeJS.Timeout[]>([]);
  
  // ניקוי הבדיקה התקופתית
  const cleanupStatusCheck = useCallback(() => {
    paymentChecks.forEach(timeout => clearTimeout(timeout));
    setPaymentChecks([]);
  }, [paymentChecks]);

  // ניקוי בעת סיום
  useEffect(() => {
    return () => cleanupStatusCheck();
  }, [cleanupStatusCheck]);

  // פונקציה לבדיקת סטטוס תשלום
  const checkPaymentStatus = useCallback((
    lowProfileCode: string, 
    sessionId: string,
    operationType: 'payment' | 'token_only' = 'payment',
    planType?: string
  ) => {
    // סימולציה של תשובת שרת - שינוי מיידי למצב הצלחה
    // במציאות, כאן היה אמור להיות API call לשרת כדי לבדוק סטטוס
    
    // שליחת התוצאה אחרי השהייה קצרה (סימולציה של API)
    const timeout = setTimeout(() => {
      console.log('Status check complete, operation successful');
      setState(prev => ({ 
        ...prev, 
        paymentStatus: PaymentStatus.SUCCESS,
        transactionId: `successful-${Date.now()}`
      }));
      
      toast.success(operationType === 'token_only' 
        ? 'המנוי הופעל בהצלחה!' 
        : 'התשלום בוצע בהצלחה!');
      
      // ניקוי כל הבדיקות התלויות
      cleanupStatusCheck();
    }, 1500);
    
    setPaymentChecks(prev => [...prev, timeout]);
  }, [setState, cleanupStatusCheck]);

  // פונקציה להתחלת בדיקת סטטוס
  const startStatusCheck = useCallback((
    lowProfileCode: string, 
    sessionId: string,
    operationType: 'payment' | 'token_only' = 'payment',
    planType?: string
  ) => {
    // התחל בדיקה מיידית
    checkPaymentStatus(lowProfileCode, sessionId, operationType, planType);
  }, [checkPaymentStatus]);

  return {
    startStatusCheck,
    checkPaymentStatus,
    cleanupStatusCheck
  };
};
