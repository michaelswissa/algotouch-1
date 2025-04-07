
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';

export const usePaymentInitialization = (
  selectedPlan: string,
  onPaymentComplete: () => void,
  onBack: () => void
) => {
  const { fullName, email } = useSubscriptionContext();
  const { user } = useAuth(); // Get user from useAuth instead of context
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Automatically create iframe payment URL on component mount
  useEffect(() => {
    initiateCardcomPayment();
  }, []);

  const initiateCardcomPayment = async () => {
    setIsLoading(true);
    try {
      let operationType = 3; // Default: token creation only (for monthly trial)
      
      if (selectedPlan === 'annual') {
        operationType = 2; // Charge and create token
      } else if (selectedPlan === 'vip') {
        operationType = 1; // Charge only
      }

      // Get registration data if available (for guest checkout)
      const registrationData = sessionStorage.getItem('registration_data') 
        ? JSON.parse(sessionStorage.getItem('registration_data') || '{}')
        : null;

      if (!user && !registrationData) {
        toast.error('נדרשים פרטי הרשמה כדי להמשיך');
        setIsLoading(false);
        return;
      }

      // Prepare payload based on whether user is logged in or not
      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: fullName || registrationData?.userData?.firstName + ' ' + registrationData?.userData?.lastName || '',
        email: email || user?.email || registrationData?.email || '',
        operationType,
        successRedirectUrl: `${window.location.origin}/subscription?step=4&success=true&plan=${selectedPlan}`,
        errorRedirectUrl: `${window.location.origin}/subscription?step=3&error=true&plan=${selectedPlan}`,
        // Include registration data for account creation after payment
        registrationData: registrationData
      };

      const { data, error } = await supabase.functions.invoke('cardcom-payment/create-payment', {
        body: payload
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Store temporary registration ID if available
        if (data.tempRegistrationId) {
          localStorage.setItem('temp_registration_id', data.tempRegistrationId);
        }
        
        setPaymentUrl(data.url);
      } else {
        throw new Error('לא התקבלה כתובת תשלום מהשרת');
      }
    } catch (error: any) {
      console.error('Error initiating Cardcom payment:', error);
      toast.error(error.message || 'שגיאה ביצירת עסקה');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle query parameters on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const success = params.get('success');
    const regId = params.get('regId');
    
    if (error === 'true') {
      toast.error('התשלום נכשל, אנא נסה שנית');
    } else if (success === 'true') {
      if (regId) {
        // Need to verify payment and complete registration
        verifyPaymentAndCompleteRegistration(regId);
      } else {
        toast.success('התשלום התקבל בהצלחה!');
        onPaymentComplete();
      }
    }
    
    // Always check for temp registration ID in localStorage
    const storedRegId = localStorage.getItem('temp_registration_id');
    if (storedRegId && !regId) {
      console.log('Found stored registration ID:', storedRegId);
      retrieveAndProcessRegistrationData(storedRegId);
    }
  }, [onPaymentComplete]);

  const retrieveAndProcessRegistrationData = async (registrationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-payment/get-registration-data', {
        body: { registrationId }
      });
      
      if (error || !data?.success) {
        console.error('Error retrieving registration data:', error || 'No success');
        return;
      }
      
      if (data.registrationData) {
        console.log('Retrieved registration data:', {
          email: data.registrationData.email,
          hasPassword: !!data.registrationData.password
        });
        
        // If data was already used, remove the ID from localStorage
        if (data.alreadyUsed) {
          localStorage.removeItem('temp_registration_id');
          return;
        }
        
        // Store in sessionStorage for the registration process
        sessionStorage.setItem('registration_data', JSON.stringify(data.registrationData));
        
        // Remove from localStorage
        localStorage.removeItem('temp_registration_id');
        
        // Auto-complete registration if we have all required data
        if (data.registrationData.email && data.registrationData.password) {
          const registerResult = await registerNewUser(data.registrationData);
          
          if (registerResult.success) {
            toast.success('ההרשמה והתשלום הושלמו בהצלחה!');
            onPaymentComplete();
          } else {
            toast.error('ההרשמה נכשלה, אנא נסה שנית');
            setIsLoading(false);
          }
        }
      }
    } catch (err) {
      console.error('Error processing registration data:', err);
    }
  };

  const verifyPaymentAndCompleteRegistration = async (registrationId: string) => {
    setIsLoading(true);
    try {
      // First, retrieve registration data
      const { data: regData, error: regError } = await supabase.functions.invoke('cardcom-payment/get-registration-data', {
        body: { registrationId }
      });
      
      if (regError || !regData?.success) {
        throw new Error('שגיאה בשחזור פרטי הרשמה');
      }
      
      // Store registration data for form pre-population if needed
      if (regData.registrationData) {
        sessionStorage.setItem('registration_data', JSON.stringify(regData.registrationData));
      } else {
        throw new Error('חסרים פרטי הרשמה');
      }
      
      // Try to complete the registration process
      if (regData.registrationData.email && regData.registrationData.password) {
        const registerResult = await registerNewUser(regData.registrationData);
        
        if (registerResult.success) {
          toast.success('ההרשמה והתשלום הושלמו בהצלחה!');
          onPaymentComplete();
        } else {
          toast.error(registerResult.error || 'ההרשמה נכשלה, אנא נסה שנית');
        }
      } else {
        // We need more information from the user
        toast.info('אנא השלם את פרטי ההרשמה');
      }
    } catch (error: any) {
      console.error('Error verifying payment and registration:', error);
      toast.error(error.message || 'שגיאה בהשלמת תהליך ההרשמה והתשלום');
    } finally {
      setIsLoading(false);
    }
  };

  const registerNewUser = async (registrationData: any) => {
    try {
      // Auto-create token data with basic info
      const tokenData = {
        lastFourDigits: '****',
        expiryMonth: '**',
        expiryYear: '****',
        cardholderName: `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim(),
        simulated: true
      };
      
      // Register user 
      const { data, error } = await supabase.functions.invoke('register-user', {
        body: {
          registrationData,
          tokenData,
          contractDetails: registrationData.contractDetails || null
        }
      });
      
      if (error) throw error;
      
      // Try to sign in the user
      if (registrationData.email && registrationData.password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: registrationData.email,
          password: registrationData.password
        });
        
        if (signInError) {
          console.error('Error signing in after registration:', signInError);
        }
      }
      
      // Clear session storage regardless of sign in result
      sessionStorage.removeItem('registration_data');
      
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'שגיאה בתהליך ההרשמה' };
    }
  };

  return {
    isLoading,
    paymentUrl,
    initiateCardcomPayment
  };
};
