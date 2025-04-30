
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PaymentStatusEnum } from '@/types/payment';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { useAuth } from '@/contexts/auth/useAuth';
import { StorageService } from '@/services/storage/StorageService';
import type { ContractData } from '@/lib/contracts/contract-validation-service';

interface UsePaymentIframeProps {
  planId: string;
  onPaymentComplete?: () => void;
}

interface PaymentIframeState {
  isLoading: boolean;
  iframeUrl: string | null;
  paymentStatus: PaymentStatusEnum;
  error: string | null;
  sessionId: string | null;
  reference: string | null;
}

export const usePaymentIframe = ({ planId, onPaymentComplete }: UsePaymentIframeProps) => {
  const [state, setState] = useState<PaymentIframeState>({
    isLoading: true,
    iframeUrl: null,
    paymentStatus: PaymentStatusEnum.IDLE,
    error: null,
    sessionId: null,
    reference: null
  });
  
  const { user } = useAuth();
  
  // Initialize the payment iframe
  const initializePayment = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null, paymentStatus: PaymentStatusEnum.INITIALIZING }));
      
      // Get contract data from storage
      const contractData = StorageService.get<ContractData>('contract_data');
      if (!contractData) {
        throw new Error('נדרש למלא את פרטי החוזה לפני ביצוע תשלום');
      }

      if (!contractData.email || !contractData.fullName) {
        throw new Error('חסרים פרטי לקוח בחוזה');
      }
      
      // Determine operation type based on plan
      const operationType = planId === 'monthly' ? 'token_only' : 'payment';
      
      PaymentLogger.log('Initializing payment for plan', { planId, operationType });
      
      // Initialize payment session
      const result = await CardComService.initializePayment({
        planId,
        userId: user?.id || null,
        email: contractData.email,
        fullName: contractData.fullName,
        operationType
      });
      
      // Check and log iframe URL specifically
      if (!result.iframeUrl) {
        PaymentLogger.error('No iframe URL received from CardComService');
        throw new Error('לא התקבלה כתובת URL לתשלום');
      }
      
      PaymentLogger.log('Received payment iframe URL:', result.iframeUrl);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        iframeUrl: result.iframeUrl,
        sessionId: result.sessionId,
        reference: result.reference,
        paymentStatus: PaymentStatusEnum.IDLE
      }));
      
      PaymentLogger.log('Payment iframe initialized successfully', result);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה באתחול התשלום';
      PaymentLogger.error('Payment iframe initialization error:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        paymentStatus: PaymentStatusEnum.FAILED
      }));
      
      toast.error(errorMessage);
      return false;
    }
  }, [planId, user?.id]);
  
  // Check payment status at intervals
  useEffect(() => {
    if (!state.sessionId || state.paymentStatus !== PaymentStatusEnum.IDLE) return;
    
    const checkStatus = async () => {
      try {
        const statusResult = await CardComService.checkPaymentStatus(state.sessionId!);
        
        if (statusResult.status === 'success') {
          setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.SUCCESS }));
          toast.success('התשלום הושלם בהצלחה!');
          
          if (onPaymentComplete) {
            onPaymentComplete();
          }
        } else if (statusResult.status === 'failed') {
          setState(prev => ({ ...prev, paymentStatus: PaymentStatusEnum.FAILED }));
          toast.error('התשלום נכשל');
        }
      } catch (error) {
        PaymentLogger.error('Error checking payment status:', error);
      }
    };
    
    // Check status every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    
    // Clean up interval on unmount or when status changes
    return () => clearInterval(interval);
  }, [state.sessionId, state.paymentStatus, onPaymentComplete]);
  
  // Initialize payment on mount
  useEffect(() => {
    initializePayment();
  }, [initializePayment]);
  
  return {
    ...state,
    initializePayment,
    retryPayment: initializePayment,
  };
};
