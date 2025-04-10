
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TokenData } from '@/types/payment';
import { getSubscriptionPlans } from '../utils/paymentHelpers';
import { useRegistrationData } from './useRegistrationData';
import { 
  handleExistingUserPayment, 
  registerNewUser,
  initiateExternalPayment,
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
        const updatedData = {
          ...registrationData,
          paymentToken: result.tokenInfo || {
            token: result.paymentDetails?.cardLastDigits || '',
            expiry: result.paymentDetails?.cardExpiry || '',
            last4Digits: result.paymentDetails?.cardLastDigits || '',
            cardholderName: result.paymentDetails?.cardOwnerName || ''
          }
        };
        
        updateRegistrationData(updatedData);
        
        if (updatedData.email && updatedData.password) {
          await registerNewUser(updatedData, updatedData.paymentToken);
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
        const updatedData = {
          ...registrationData,
          paymentToken: {
            token: tokenData.token || tokenData.lastFourDigits,
            expiry: `${tokenData.expiryMonth}/${tokenData.expiryYear}`,
            last4Digits: tokenData.lastFourDigits,
            cardholderName: tokenData.cardholderName
          },
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
          paymentToken: {
            token: tokenData.token || tokenData.lastFourDigits,
            expiry: `${tokenData.expiryMonth}/${tokenData.expiryYear}`,
            last4Digits: tokenData.lastFourDigits,
            cardholderName: tokenData.cardholderName
          },
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

  const handleSubmit = async (e: React.FormEvent, cardData: {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
  }) => {
    e.preventDefault();
    
    const { cardNumber, cardholderName, expiryDate, cvv } = cardData;
    
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      toast.error('נא למלא את כל פרטי התשלום');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const tokenData: TokenData = {
        token: `sim_${Date.now()}`,
        lastFourDigits: cardNumber.replace(/\s/g, '').slice(-4),
        expiryMonth: expiryDate.split('/')[0],
        expiryYear: `20${expiryDate.split('/')[1]}`,
        cardholderName
      };
      
      await handlePaymentProcessing(tokenData);
    } catch (error: any) {
      console.error('Payment processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExternalPayment = async () => {
    let operationTypeValue = 3;
    
    if (planId === 'annual') {
      operationTypeValue = 2;
    } else if (planId === 'vip') {
      operationTypeValue = 1;
    }
    
    setIsProcessing(true);
    try {
      // Detailed logging for debugging
      console.log('Starting external payment process with planId:', planId);
      
      try {
        // First try with the payment service helper
        console.log('Attempting payment with payment service helper...');
        const result = await initiateExternalPayment(planId, user, registrationData);
        console.log('Payment service helper response:', result);
        
        if (result && result.url) {
          console.log('Success! Redirecting to payment URL:', result.url);
          window.location.href = result.url;
          return;
        }
        console.log('Payment service helper did not return a URL, falling back to direct function call');
      } catch (helperError) {
        console.error('Error using payment service helper:', helperError);
      }
      
      console.log('Falling back to direct supabase function invocation...');
      console.log('Function parameters:', {
        action: 'initiate',
        planId: planId,
        userId: user?.id,
        email: user?.email,
        diagnosticInfo
      });

      // Try multiple approaches, starting with direct function invocation
      try {
        console.time('direct-payment-function-call');
        const { data, error } = await supabase.functions.invoke('direct-payment', {
          body: {
            action: 'initiate',
            planId: planId,
            userId: user?.id,
            email: user?.email
          }
        });
        console.timeEnd('direct-payment-function-call');
        
        console.log('Direct payment function response:', data);
        
        if (error) {
          console.error('Supabase function error:', error);
          throw new Error(`Edge Function error: ${error.message}`);
        }
        
        if (!data || !data.url) {
          console.error('Invalid response data:', data);
          throw new Error('לא התקבלה כתובת תשלום מהשרת');
        }
        
        if (data.tempRegistrationId) {
          localStorage.setItem('temp_registration_id', data.tempRegistrationId);
        }
        
        const url = new URL(data.url);
        const baseUrl = `${window.location.origin}/subscription`;
        
        // Add detailed diagnostics as URL parameters
        url.searchParams.set('diagnosticTime', new Date().toISOString());
        
        url.searchParams.set('successRedirectUrl', 
          `${baseUrl}?step=payment&success=true&lpId=${data.lowProfileId}`);
        
        url.searchParams.set('errorRedirectUrl', 
          `${baseUrl}?step=payment&error=true&lpId=${data.lowProfileId}`);
        
        console.log('Redirecting to payment URL:', url.toString());
        window.location.href = url.toString();
      } catch (directError) {
        console.error('Direct function invocation failed:', directError);
        
        // Try fallback to cardcom-payment function if available
        try {
          console.log('Attempting fallback to cardcom-payment function...');
          const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('cardcom-payment/create-payment', {
            body: {
              planId,
              userInfo: user ? { userId: user.id, email: user.email } : null,
              registrationData: registrationData
            }
          });
          
          console.log('Fallback function response:', fallbackData);
          
          if (fallbackError) {
            throw fallbackError;
          }
          
          if (fallbackData && fallbackData.url) {
            console.log('Fallback successful! Redirecting to:', fallbackData.url);
            window.location.href = fallbackData.url;
            return;
          }
          
          throw new Error('גם ניסיון גיבוי לא הצליח');
        } catch (fallbackAttemptError) {
          console.error('Fallback attempt failed:', fallbackAttemptError);
          throw directError; // Throw the original error
        }
      }
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      
      // Collect detailed diagnostic information
      const diagnosticData = {
        timestamp: new Date().toISOString(),
        route: window.location.pathname + window.location.search,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        },
        error: {
          message: error.message,
          stack: error.stack
        },
        functionDiagnostics: diagnosticInfo
      };
      
      // Log detailed diagnostic information
      console.error('Payment diagnostic data:', diagnosticData);
      
      const errorInfo = await handleError(error, {
        planId,
        operationType: operationTypeValue,
        userInfo: user ? { userId: user.id, email: user.email } : null,
        diagnosticData
      });
      
      const paymentError = new PaymentError(
        errorInfo?.message || 'שגיאה ביצירת עסקה'
      );
      paymentError.code = errorInfo?.code;
      paymentError.details = { ...errorInfo, diagnostics: diagnosticData };
      
      setPaymentError(paymentError);
      
      setIsProcessing(false);
      
      toast.error('אירעה שגיאה בעיבוד התשלום. נסה שנית מאוחר יותר.');
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
    handleExternalPayment,
    isRecovering,
    plan
  };
};
