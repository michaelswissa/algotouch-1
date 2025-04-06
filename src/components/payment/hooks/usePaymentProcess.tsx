
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

export const usePaymentProcess = ({ planId, onPaymentComplete }: UsePaymentProcessProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Get plan details
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Load registration data from session storage
  const loadRegistrationData = () => {
    // If user is authenticated, we don't need registration data
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
          planId: parsedData.planId
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

  // Process payment and create user for new users
  const handlePaymentAndCreateUser = async (tokenData: TokenData) => {
    if (!registrationData && !user) {
      // Create a temporary record that will be completed after payment
      const tempRegId = `temp_reg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('temp_registration_id', tempRegId);
      
      // If we have partial data, save it
      if (registrationData) {
        const { data, error } = await supabase.functions.invoke('cardcom-payment/save-registration-data', {
          body: {
            registrationId: tempRegId,
            registrationData
          }
        });
        
        if (error) {
          console.error("Error saving registration data:", error);
          throw new Error('שגיאה בשמירת נתוני הרשמה זמניים');
        }
      }
      
      // No user creation yet - will be done after payment and registration
      return;
    }

    if (registrationData && !user) {
      // Implement user registration after successful payment
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            first_name: registrationData.userData?.firstName,
            last_name: registrationData.userData?.lastName,
            registration_complete: true,
            signup_step: 'completed',
            signup_date: new Date().toISOString()
          }
        }
      });
      
      if (userError) {
        throw userError;
      }
      
      if (!userData.user) {
        throw new Error('יצירת משתמש נכשלה');
      }

      // Add a delay to ensure the user is created before proceeding
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create subscription
      const trialEndsAt = new Date();
      trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month trial
      
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userData.user.id,
          plan_type: registrationData.planId,
          status: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
          payment_method: tokenData,
          contract_signed: true,
          contract_signed_at: new Date().toISOString()
        });
      
      if (subscriptionError) {
        console.error('Subscription error:', subscriptionError);
        throw subscriptionError;
      }
      
      // Create payment history record
      await supabase.from('payment_history').insert({
        user_id: userData.user.id,
        subscription_id: userData.user.id,
        amount: 0,
        status: 'trial_started',
        payment_method: tokenData
      });
    } else if (user) {
      // Handle existing user payment
      await handleExistingUserPayment(tokenData);
    }
  };

  // Handle payment process for existing users
  const handleExistingUserPayment = async (tokenData: TokenData) => {
    if (!user) return;
    
    // Determine operation type based on plan
    let operationType = planId === 'monthly' ? 3 : // Create token only (trial)
                        planId === 'annual' ? 2 : // Charge and create token
                        1; // Charge only (VIP)
    
    console.log('Processing payment for existing user:', {
      userId: user.id,
      planId,
      operationType
    });
    
    // Create direct payment using our tokenization service
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
    
    // Update subscription in database
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
    
    // Record payment history
    const price = planDetails[planId as keyof typeof planDetails]?.price || 0;
    
    // Only create payment record for non-trial or if explicitly charging
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
            simulated: true // Mark as simulated payment
          }
        });
    } else {
      // For trials, record a trial_started entry
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
  };

  // Main form submission handler
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
      // Create token data from card details
      const tokenData = {
        lastFourDigits: cardNumber.slice(-4),
        expiryMonth: expiryDate.split('/')[0],
        expiryYear: `20${expiryDate.split('/')[1]}`,
        cardholderName
      };
      
      await handlePaymentAndCreateUser(tokenData);
      
      toast.success('התשלום התקבל בהצלחה!');
      
      // Clear registration data from session storage
      if (registrationData) {
        sessionStorage.removeItem('registration_data');
      }
      
      onPaymentComplete();
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast.error(error.message || 'אירעה שגיאה בתהליך התשלום. נסה שנית.');
    } finally {
      setIsProcessing(false);
    }
  };

  // External payment processing with Cardcom
  const handleExternalPayment = async () => {
    setIsProcessing(true);
    try {
      let operationType = 3; // Default: token creation only (for monthly trial)
      
      if (planId === 'annual') {
        operationType = 2; // Charge and create token
      } else if (planId === 'vip') {
        operationType = 1; // Charge only
      }

      // Determine user info for the payload
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
        // If we have a temp registration ID, store it
        if (data.tempRegistrationId) {
          localStorage.setItem('temp_registration_id', data.tempRegistrationId);
        }
        
        // Redirect to payment page
        window.location.href = data.url;
      } else {
        throw new Error('לא התקבלה כתובת תשלום מהשרת');
      }
    } catch (error: any) {
      console.error('Error initiating external payment:', error);
      toast.error(error.message || 'שגיאה ביצירת עסקה');
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    registrationData,
    registrationError,
    loadRegistrationData,
    handleSubmit,
    handleExternalPayment,
    plan
  };
};
