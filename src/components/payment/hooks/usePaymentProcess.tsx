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

export const usePaymentProcess = ({ planId, onPaymentComplete }: UsePaymentProcessProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null);
  
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
      const { data, error } = await supabase.functions.invoke('direct-payment', {
        body: {
          action: 'initiate',
          planId: planId,
          userId: user?.id,
          email: user?.email
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data.tempRegistrationId) {
        localStorage.setItem('temp_registration_id', data.tempRegistrationId);
      }
      
      const url = new URL(data.url);
      const baseUrl = `${window.location.origin}/subscription`;
      
      url.searchParams.set('successRedirectUrl', 
        `${baseUrl}?step=payment&success=true&lpId=${data.lowProfileId}`);
      
      url.searchParams.set('errorRedirectUrl', 
        `${baseUrl}?step=payment&error=true&lpId=${data.lowProfileId}`);
      
      window.location.href = url.toString();
    } catch (error: any) {
      const errorInfo = await handleError(error, {
        planId,
        operationType: operationTypeValue,
        userInfo: user ? { userId: user.id, email: user.email } : null
      });
      
      const paymentError = new PaymentError(
        errorInfo?.message || 'שגיאה ביצירת עסקה'
      );
      setPaymentError(paymentError);
      
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    registrationData,
    registrationError,
    paymentError,
    loadRegistrationData,
    handleSubmit,
    handleExternalPayment,
    isRecovering,
    plan
  };
};
