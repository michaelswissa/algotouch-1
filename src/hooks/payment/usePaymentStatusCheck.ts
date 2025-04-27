
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatus, PaymentStatusType } from '@/components/payment/types/payment';

interface UsePaymentStatusCheckProps {
  lowProfileCode: string | null;
  setState: (updater: any) => void;
  paymentStatus: PaymentStatusType;
}

export const usePaymentStatusCheck = ({ 
  lowProfileCode, 
  setState,
  paymentStatus
}: UsePaymentStatusCheckProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const maxChecks = 10; // Maximum number of status checks
  const checkInterval = 3000; // Check every 3 seconds
  
  const checkPaymentStatus = useCallback(async () => {
    if (!lowProfileCode || 
        isChecking || 
        paymentStatus !== PaymentStatus.PROCESSING || 
        checkCount >= maxChecks) {
      return;
    }
    
    setIsChecking(true);
    console.log(`Checking payment status (attempt ${checkCount + 1}/${maxChecks})...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: {
          lowProfileCode
        }
      });
      
      if (error) {
        console.error("Error checking payment status:", error);
        return;
      }
      
      console.log("Payment status check result:", data);
      
      if (data.success && data.status === 'completed') {
        console.log("Payment completed successfully!");
        setState((prev: any) => ({ 
          ...prev, 
          paymentStatus: PaymentStatus.SUCCESS,
          transactionId: data.transactionId || 'token-created'
        }));
        
        // Clear payment session from localStorage on success
        localStorage.removeItem('payment_session');
      } else if (data.success && data.status === 'failed') {
        console.error("Payment failed:", data);
        setState((prev: any) => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    } finally {
      setIsChecking(false);
      setCheckCount(prev => prev + 1);
    }
  }, [lowProfileCode, isChecking, paymentStatus, checkCount, setState]);
  
  useEffect(() => {
    // Only start checking when payment is processing
    if (paymentStatus !== PaymentStatus.PROCESSING) {
      return;
    }
    
    // Initial check
    checkPaymentStatus();
    
    // Set up interval for continued checking
    const intervalId = setInterval(() => {
      checkPaymentStatus();
    }, checkInterval);
    
    // Clear interval when max checks reached or status changes
    return () => {
      clearInterval(intervalId);
    };
  }, [paymentStatus, checkPaymentStatus]);
  
  return {
    isChecking,
    checkCount,
    maxChecks,
    checkPaymentStatus
  };
};
