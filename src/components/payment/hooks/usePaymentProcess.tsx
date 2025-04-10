
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TokenData, RegistrationData, SubscriptionPlan } from '@/types/payment';
import { getSubscriptionPlans } from '../utils/paymentHelpers';
import { useRegistrationData } from './useRegistrationData';
import { 
  handleExistingUserPayment, 
  registerNewUser,
  verifyExternalPayment
} from '../services/paymentService';
import { UsePaymentProcessProps, PaymentError } from './types';
import { usePaymentErrorHandling } from './usePaymentErrorHandling';
import { supabase } from '@/integrations/supabase/client';

export const usePaymentProcess = ({ planId, onPaymentComplete }: UsePaymentProcessProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  
  const { 
    registrationData, 
    registrationError, 
    loadRegistrationData,
    updateRegistrationData,
    clearRegistrationData
  } = useRegistrationData();

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const { handleError, checkForRecovery, isRecovering, sessionId } = usePaymentErrorHandling({
    planId,
    onCardUpdate: () => navigate('/subscription?step=update-card'),
    onAlternativePayment: () => navigate('/subscription?step=alternative-payment')
  });

  useEffect(() => {
    const checkRecovery = async () => {
      const recoveryData = await checkForRecovery();
      if (recoveryData) {
        toast.info('נמצאו פרטים להשלמת התשלום');
        
        if (recoveryData.planId && recoveryData.planId !== planId) {
          navigate(`/subscription?step=3&plan=${recoveryData.planId}&recover=${sessionId}`);
        }
      }
      
      const params = new URLSearchParams(window.location.search);
      const lowProfileId = params.get('lpId');
      const success = params.get('success');
      
      if (lowProfileId && success === 'true') {
        await verifyPaymentFromUrl(lowProfileId);
      }
    };
    
    checkRecovery();

    // Diagnostic: Check if the edge function is accessible
    const checkEdgeFunctionStatus = async () => {
      try {
        const functionName = 'direct-payment';
        console.log(`Running diagnostic check for edge function: ${functionName}`);
        
        const { data: functionData, error: functionError } = await supabase
          .functions
          .invoke(functionName, {
            body: { action: 'health-check' }
          });
        
        if (functionError) {
          console.error('Edge function diagnostic error:', functionError);
          setDiagnosticInfo({ 
            status: 'error', 
            function: functionName,
            error: functionError 
          });
        } else {
          console.log('Edge function diagnostic result:', functionData);
          setDiagnosticInfo({ 
            status: 'success', 
            function: functionName,
            result: functionData 
          });
        }
      } catch (error) {
        console.error('Edge function diagnostic exception:', error);
        setDiagnosticInfo({ 
          status: 'exception', 
          error 
        });
      }
    };
    
    checkEdgeFunctionStatus();
  }, []);

  const verifyPaymentFromUrl = async (lowProfileId: string) => {
    try {
      setIsProcessing(true);
      
      const result = await verifyExternalPayment(lowProfileId);
      
      if (!result.success) {
        toast.error('אימות התשלום נכשל: ' + (result.error || 'שגיאה לא ידועה'));
        
        const paymentError = new PaymentError(
          result.error || 'אימות התשלום נכשל',
          'payment_verification_failed'
        );
        
        setPaymentError(paymentError);
        setIsProcessing(false);
        return;
      }
      
      toast.success('התשלום אומת בהצלחה!');
      
      if (registrationData) {
        const tokenInfo = result.tokenInfo || {
          token: result.paymentDetails?.cardLastDigits || '',
          lastFourDigits: result.paymentDetails?.cardLastDigits || '',
          expiryMonth: result.paymentDetails?.cardExpiry ? 
            parseInt(result.paymentDetails.cardExpiry.split('/')[0], 10) : 0,
          expiryYear: result.paymentDetails?.cardExpiry ? 
            parseInt(result.paymentDetails.cardExpiry.split('/')[1], 10) : 0,
          cardholderName: result.paymentDetails?.cardOwnerName || ''
        };
        
        const updatedData = {
          ...registrationData,
          paymentToken: tokenInfo
        };
        
        updateRegistrationData(updatedData);
        
        if (updatedData.email && updatedData.password) {
          await registerNewUser(updatedData, tokenInfo);
        }
      }
      
      onPaymentComplete();
    } catch (error: any) {
      console.error("Payment verification error:", error);
      
      const errorInfo = await handleError(error, {
        planId,
        operationType: 3
      });
      
      const paymentError = new PaymentError(
        errorInfo?.message || 'שגיאה באימות התשלום'
      );
      paymentError.code = errorInfo?.code;
      paymentError.details = errorInfo;
      
      setPaymentError(paymentError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentProcessing = async (tokenData: TokenData) => {
    let operationTypeValue = 3;
    
    if (planId === 'annual') {
      operationTypeValue = 2;
    } else if (planId === 'vip') {
      operationTypeValue = 1;
    }
    
    try {
      setIsProcessing(true);
      setPaymentError(null);
      
      if (user) {
        await handleExistingUserPayment(user.id, planId, tokenData, operationTypeValue, planDetails);
      } else if (registrationData) {
        const updatedData: Partial<RegistrationData> = {
          ...registrationData,
          paymentToken: tokenData,
          planId
        };
        
        sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
        updateRegistrationData(updatedData);
        
        if (updatedData.email && updatedData.password) {
          await registerNewUser(updatedData, tokenData);
        }
      } else {
        const tempRegId = `temp_reg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('temp_registration_id', tempRegId);
        
        const minimalRegData = {
          planId,
          paymentToken: tokenData,
          registrationTime: new Date().toISOString()
        };
        
        sessionStorage.setItem('registration_data', JSON.stringify(minimalRegData));
        
        toast.success('התשלום התקבל בהצלחה! נא להשלים את תהליך ההרשמה.');
      }
      
      onPaymentComplete();
    } catch (error: any) {
      console.error("Payment processing error:", error);
      
      const errorInfo = await handleError(error, {
        tokenData,
        planId,
        operationType: operationTypeValue
      });
      
      const paymentError = new PaymentError(
        errorInfo?.message || 'שגיאה לא ידועה בתהליך התשלום'
      );
      paymentError.code = errorInfo?.code;
      paymentError.details = errorInfo;
      
      setPaymentError(paymentError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, tokenData: TokenData) => {
    e.preventDefault();
    
    if (!tokenData || !tokenData.token) {
      toast.error('לא התקבלו פרטי תשלום מאובטחים');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await handlePaymentProcessing(tokenData);
    } catch (error: any) {
      console.error('Payment processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    registrationData,
    registrationError,
    paymentError,
    diagnosticInfo,
    loadRegistrationData,
    handleSubmit,
    isRecovering,
    plan
  };
};
