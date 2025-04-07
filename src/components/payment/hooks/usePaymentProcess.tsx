
import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TokenData } from '@/types/payment';
import { getSubscriptionPlans } from '../utils/paymentHelpers';
import { useRegistrationData } from './useRegistrationData';
import { 
  handleExistingUserPayment, 
  registerNewUser,
  initiateExternalPayment
} from '../services/paymentService';
import { UsePaymentProcessProps, PaymentError } from './types';

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

  const handlePaymentProcessing = async (tokenData: TokenData) => {
    try {
      setPaymentError(null);
      
      let operationType = 3; // Default: token creation only (for monthly subscription with free trial)
      
      if (planId === 'annual') {
        operationType = 2; // Charge and create token for recurring annual payments
      } else if (planId === 'vip') {
        operationType = 1; // Charge only - one-time payment
      }
      
      if (user) {
        await handleExistingUserPayment(user.id, planId, tokenData, operationType, planDetails);
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
      
      const paymentError: PaymentError = new Error(error.message || 'שגיאה לא ידועה בתהליך התשלום');
      paymentError.code = error.code;
      paymentError.details = error.details;
      
      setPaymentError(paymentError);
      toast.error(error.message || 'שגיאה בתהליך התשלום. אנא נסה שנית.');
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
      toast.error(error.message || 'אירעה שגיאה בתהליך התשלום. נסה שנית.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExternalPayment = async () => {
    setIsProcessing(true);
    try {
      const data = await initiateExternalPayment(planId, user, registrationData);
      
      if (data.tempRegistrationId) {
        localStorage.setItem('temp_registration_id', data.tempRegistrationId);
      }
      
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error initiating external payment:', error);
      
      const paymentError: PaymentError = new Error(error.message || 'שגיאה ביצירת עסקה');
      setPaymentError(paymentError);
      
      toast.error(error.message || 'שגיאה ביצירת עסקה');
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
    plan
  };
};
