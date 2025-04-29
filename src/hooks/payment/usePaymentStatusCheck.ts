
import { useState, useCallback, useEffect } from 'react';
import { PaymentStatusEnum } from '@/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { CardComService } from '@/services/payment/CardComService';
import { toast } from 'sonner';

interface UsePaymentStatusCheckProps {
  lowProfileCode: string;
  sessionId: string;
  setState: (state: any) => void;
  onPaymentSuccess: () => void;
}

export const usePaymentStatusCheck = ({ 
  lowProfileCode, 
  sessionId, 
  setState, 
  onPaymentSuccess 
}: UsePaymentStatusCheckProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  
  const checkPaymentStatus = useCallback(async (lowProfileCode: string, sessionId: string) => {
    if (!lowProfileCode || !sessionId || isChecking) {
      return;
    }
    
    try {
      setIsChecking(true);
      setCheckCount(prev => prev + 1);
      
      PaymentLogger.log('Checking payment status', { 
        lowProfileCode,
        sessionId, 
        checkCount: checkCount + 1 
      });
      
      const statusResult = await CardComService.checkPaymentStatus(lowProfileCode, sessionId);
      
      PaymentLogger.log('Payment status result', statusResult);
      
      if (statusResult.success) {
        // If the payment was successful
        if (statusResult.status === 'success' || 
            statusResult.status === 'completed' || 
            statusResult.status === 'approved') {
          setState(prev => ({
            ...prev,
            paymentStatus: PaymentStatusEnum.SUCCESS
          }));
          onPaymentSuccess();
        } 
        // If the payment is still processing
        else if (statusResult.status === 'processing' || statusResult.status === 'pending') {
          // Continue checking if we haven't reached the limit
          if (checkCount < 10) {
            setTimeout(() => {
              setIsChecking(false);
              checkPaymentStatus(lowProfileCode, sessionId);
            }, 3000);
          } else {
            // Too many attempts, assume something is wrong
            setState(prev => ({
              ...prev,
              paymentStatus: PaymentStatusEnum.FAILED,
              error: 'זמן רב מדי עבר ללא תגובה מחברת האשראי'
            }));
            toast.error('זמן רב מדי עבר ללא תגובה מחברת האשראי');
          }
        } 
        // If the payment failed
        else {
          setState(prev => ({
            ...prev,
            paymentStatus: PaymentStatusEnum.FAILED,
            error: statusResult.message || 'התשלום נכשל'
          }));
          toast.error(statusResult.message || 'התשלום נכשל');
        }
      } else {
        // If there was an API error
        setState(prev => ({
          ...prev,
          paymentStatus: PaymentStatusEnum.FAILED,
          error: statusResult.message || 'שגיאה בבדיקת סטטוס התשלום'
        }));
        toast.error(statusResult.message || 'שגיאה בבדיקת סטטוס התשלום');
      }
    } catch (error) {
      PaymentLogger.error('Error checking payment status:', error);
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatusEnum.FAILED,
        error: error instanceof Error ? error.message : 'שגיאה בבדיקת סטטוס התשלום'
      }));
      toast.error('שגיאה בבדיקת סטטוס התשלום');
    } finally {
      setIsChecking(false);
    }
  }, [lowProfileCode, sessionId, isChecking, checkCount, setState, onPaymentSuccess]);

  return { checkPaymentStatus, isChecking };
};
