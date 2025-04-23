
import { useCallback, MutableRefObject } from 'react';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UsePaymentSubmissionProps {
  masterFrameRef: MutableRefObject<HTMLIFrameElement | null>;
  state: any;
  setState: (updater: any) => void;
  handleError: (message: string) => void;
  startStatusCheck: (lowProfileCode: string, sessionId: string, operationType: 'payment' | 'token_only', planId: string) => void;
  isRetrying: boolean;
  operationType: 'payment' | 'token_only';
}

export const usePaymentSubmission = ({
  masterFrameRef,
  state,
  setState,
  handleError,
  startStatusCheck,
  isRetrying,
  operationType
}: UsePaymentSubmissionProps) => {
  const submitPayment = useCallback(() => {
    if (!state.lowProfileCode) {
      handleError("חסר מזהה יחודי לעסקה, אנא נסה/י שנית");
      return;
    }
    
    if (!masterFrameRef.current?.contentWindow) {
      handleError("מסגרת התשלום אינה זמינה, אנא טען מחדש את הדף ונסה שנית");
      return;
    }
    
    try {
      // Collect form data
      const cardholderName = document.querySelector<HTMLInputElement>('#cardOwnerName')?.value || '';
      const cardOwnerId = document.querySelector<HTMLInputElement>('#cardOwnerId')?.value || '';
      const email = document.querySelector<HTMLInputElement>('#cardOwnerEmail')?.value || '';
      const phone = document.querySelector<HTMLInputElement>('#cardOwnerPhone')?.value || '';
      const expirationMonth = document.querySelector<HTMLSelectElement>('select[name="expirationMonth"]')?.value || '';
      const expirationYear = document.querySelector<HTMLSelectElement>('select[name="expirationYear"]')?.value || '';
      
      const currentOperationType = state.operationType || operationType;
      console.log('Current operation type:', currentOperationType);
      
      // Generate unique transaction ID with multiple entropy sources
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${expirationMonth}${expirationYear.substring(2)}`;
      
      // CardCom requires "lowProfileCode" param for each doTransaction
      const formData: any = {
        action: 'doTransaction',
        cardOwnerName: cardholderName,
        cardOwnerId,
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth,
        expirationYear,
        numberOfPayments: "1",
        ExternalUniqTranId: uniqueId,
        TerminalNumber: state.terminalNumber,
        Operation: currentOperationType === 'token_only' ? "CreateTokenOnly" : "ChargeOnly",
        lowProfileCode: state.lowProfileCode,
        LowProfileCode: state.lowProfileCode
      };

      console.log('Sending transaction data to CardCom:', {
        ...formData,
        cardOwnerId: '***********',
        ExternalUniqTranId: uniqueId.substring(0, 10) + '...',
      });
      
      // Send the data to the iframe
      masterFrameRef.current?.contentWindow?.postMessage(formData, '*');
      
      // Update state
      setState(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.PROCESSING
      }));
      
      // Start status check with all required parameters
      startStatusCheck(
        state.lowProfileCode,
        state.sessionId,
        currentOperationType,
        state.planId || 'monthly'
      );
    } catch (error) {
      console.error("Error submitting payment:", error);
      handleError("שגיאה בשליחת פרטי התשלום");
    }
  }, [
    masterFrameRef, 
    state,
    setState,
    handleError,
    startStatusCheck,
    operationType
  ]);

  return {
    submitPayment
  };
};
