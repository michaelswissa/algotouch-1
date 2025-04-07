import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TokenData, RegistrationData } from '@/types/payment';
import { getSubscriptionPlans } from '../utils/paymentHelpers';

interface UsePaymentProcessProps {
  planId: string;
  onPaymentComplete: () => void;
}

interface PaymentError extends Error {
  code?: string;
  details?: any;
}

export const usePaymentProcess = ({ planId, onPaymentComplete }: UsePaymentProcessProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null);

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const loadRegistrationData = () => {
    if (user) return true;
    
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setRegistrationData(parsedData);
        console.log("Loaded registration data:", {
          email: parsedData.email,
          hasPassword: !!parsedData.password,
          hasUserData: !!parsedData.userData,
          planId: parsedData.planId,
          hasPaymentToken: !!parsedData.paymentToken
        });
        
        return true;
      } catch (e) {
        console.error("Error parsing registration data:", e);
        setRegistrationError('שגיאה בטעינת פרטי הרשמה. אנא נסה מחדש.');
        return false;
      }
    } else {
      console.log("No registration data found but that's okay - user can pay first and register later");
      return true;
    }
  };

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
        await handleExistingUserPayment(tokenData, operationType);
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
        setRegistrationData(updatedData);
        
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
        onPaymentComplete();
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

  const handleExistingUserPayment = async (tokenData: TokenData, operationType: number) => {
    if (!user) return;
    
    console.log('Processing payment for existing user:', {
      userId: user.id,
      planId,
      operationType
    });
    
    const now = new Date();
    let trialEndsAt = null;
    let periodEndsAt = null;
    
    if (planId === 'monthly') {
      trialEndsAt = new Date(now);
      trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
    } else if (planId === 'annual') {
      periodEndsAt = new Date(now);
      periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
    }
    
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_type: planId,
        status: planId === 'monthly' ? 'trial' : 'active',
        trial_ends_at: trialEndsAt?.toISOString() || null,
        current_period_ends_at: periodEndsAt?.toISOString() || null,
        payment_method: tokenData,
        contract_signed: true,
        contract_signed_at: now.toISOString()
      });
    
    if (subscriptionError) {
      throw new Error(`שגיאה בעדכון מנוי: ${subscriptionError.message}`);
    }
    
    const price = planDetails[planId as keyof typeof planDetails]?.price || 0;
    
    if (planId !== 'monthly' || operationType !== 3) {
      await supabase
        .from('payment_history')
        .insert({
          user_id: user.id,
          subscription_id: user.id,
          amount: price,
          currency: 'USD',
          status: 'completed',
          payment_method: {
            ...tokenData,
            simulated: false 
          }
        });
    } else {
      await supabase
        .from('payment_history')
        .insert({
          user_id: user.id,
          subscription_id: user.id,
          amount: 0,
          currency: 'USD',
          status: 'trial_started',
          payment_method: tokenData
        });
    }
    
    toast.success('התשלום התקבל בהצלחה!');
  };

  const registerNewUser = async (registrationData: any, tokenData: TokenData) => {
    try {
      const { data, error } = await supabase.functions.invoke('register-user', {
        body: {
          registrationData,
          tokenData: {
            ...tokenData,
            simulated: false
          },
          contractDetails: registrationData.contractDetails || null
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'שגיאה לא ידועה בתהליך ההרשמה');
      }
      
      if (registrationData.email && registrationData.password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: registrationData.email,
          password: registrationData.password
        });
        
        if (signInError) {
          console.error("Error signing in after registration:", signInError);
        }
      }
      
      sessionStorage.removeItem('registration_data');
      
      toast.success('ההרשמה והתשלום הושלמו בהצלחה!');
      
      return { success: true, userId: data.userId };
    } catch (error: any) {
      console.error("Registration error:", error);
      
      const registrationError = new Error(error.message || 'שגיאה בתהליך ההרשמה');
      throw registrationError;
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
      let operationType = 3; // Default: token creation only (for monthly with free trial)
      
      if (planId === 'annual') {
        operationType = 2; // Charge and create token for recurring payments
      } else if (planId === 'vip') {
        operationType = 1; // Charge only for one-time payment
      }

      const userInfo = user 
        ? { userId: user.id, email: user.email }
        : registrationData
          ? { 
              fullName: `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim(),
              email: registrationData.email,
              registrationData
            }
          : { fullName: '', email: '' };

      const payload = {
        planId,
        ...userInfo,
        operationType,
        successRedirectUrl: `${window.location.origin}/subscription?step=4&success=true&plan=${planId}`,
        errorRedirectUrl: `${window.location.origin}/subscription?step=3&error=true&plan=${planId}`
      };

      const { data, error } = await supabase.functions.invoke('cardcom-payment/create-payment', {
        body: payload
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        if (data.tempRegistrationId) {
          localStorage.setItem('temp_registration_id', data.tempRegistrationId);
        }
        
        window.location.href = data.url;
      } else {
        throw new Error('לא התקבלה כתובת תשלום מהשרת');
      }
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
