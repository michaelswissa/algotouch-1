
import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TokenData, RegistrationData } from '@/types/payment';
import { registerUser } from '@/services/registration/registerUser';
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
        
        // Validate registration data
        if (!parsedData.email || !parsedData.password || !parsedData.userData?.firstName) {
          setRegistrationError('חסרים פרטי משתמש. אנא חזור לדף ההרשמה ומלא את כל השדות הנדרשים.');
          return false;
        }
        return true;
      } catch (e) {
        console.error("Error parsing registration data:", e);
        setRegistrationError('שגיאה בטעינת פרטי הרשמה. אנא נסה להירשם מחדש.');
        return false;
      }
    } else if (!user) {
      setRegistrationError('לא נמצאו פרטי הרשמה. אנא חזור לדף ההרשמה או התחבר למערכת.');
      return false;
    }
    return true;
  };

  // Process payment for new users (registration flow)
  const handleNewUserPayment = async (tokenData: TokenData) => {
    if (!registrationData) {
      throw new Error('פרטי ההרשמה חסרים. אנא חזור לעמוד ההרשמה והתחל מחדש.');
    }

    console.log('Processing payment for new user with registration data:', {
      email: registrationData.email,
      planId: registrationData.planId,
      hasPassword: !!registrationData.password,
      hasUserData: !!registrationData.userData,
      firstName: registrationData.userData?.firstName,
      lastName: registrationData.userData?.lastName
    });
    
    // First create the user with subscription
    const result = await registerUser({
      registrationData,
      tokenData,
      contractDetails: registrationData.contractDetails || null
    });
    
    if (!result.success) {
      throw result.error;
    }
    
    // Clear registration data from session storage
    sessionStorage.removeItem('registration_data');
    
    // Log in the newly created user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: registrationData.email,
      password: registrationData.password
    });
    
    if (signInError) {
      console.error('Error signing in after registration:', signInError);
      // Continue anyway, as the registration was successful
    }
  };

  // Handle payment process for existing users
  const handleExistingUserPayment = async (tokenData: TokenData) => {
    if (!user) {
      throw new Error('משתמש לא מחובר. אנא התחבר תחילה.');
    }
    
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
      
      // Two paths: registration flow or existing user flow
      if (!user) {
        // Check if we have valid registration data before proceeding
        if (!registrationData || !registrationData.email || !registrationData.password || 
            !registrationData.userData || !registrationData.userData.firstName) {
          throw new Error('פרטי ההרשמה חסרים או לא תקינים. אנא חזור לעמוד ההרשמה והתחל מחדש.');
        }
        
        await handleNewUserPayment(tokenData);
      } else {
        await handleExistingUserPayment(tokenData);
      }
      
      toast.success('התשלום התקבל בהצלחה!');
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
    // Check for registration data validity if not authenticated
    if (!user && (!registrationData || !registrationData.email || !registrationData.password)) {
      toast.error('חסרים פרטים להרשמה. אנא חזור לעמוד ההרשמה ומלא את כל הפרטים הנדרשים.');
      return;
    }
    
    setIsProcessing(true);
    try {
      let operationType = 3; // Default: token creation only (for monthly trial)
      
      if (planId === 'annual') {
        operationType = 2; // Charge and create token
      } else if (planId === 'vip') {
        operationType = 1; // Charge only
      }

      const payload: any = {
        planId,
        userId: user?.id,
        fullName: user ? undefined : `${registrationData?.userData?.firstName || ''} ${registrationData?.userData?.lastName || ''}`.trim(),
        email: user?.email || registrationData?.email,
        operationType,
        successRedirectUrl: `${window.location.origin}/subscription?step=4&success=true&plan=${planId}`,
        errorRedirectUrl: `${window.location.origin}/subscription?step=3&error=true&plan=${planId}`
      };
      
      // If we have registration data and no authenticated user, include it in the payload
      if (registrationData && !user) {
        payload.registrationData = registrationData;
      }

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
