
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';

export const usePaymentInitialization = (
  selectedPlan: string,
  onPaymentComplete: () => void,
  onBack: () => void,
  setIsLoadingExternal?: (val: boolean) => void
) => {
  const { fullName, email } = useSubscriptionContext();
  const { user } = useAuth();
  const [isLoading, setIsLoadingState] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  
  // Use either the external loading state or the internal one
  const setIsLoading = setIsLoadingExternal || setIsLoadingState;

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

      // Create base URLs for success and error redirects with absolute paths
      const baseUrl = `${window.location.origin}/subscription`;
      
      // Ensure success redirect URL forces completion step and breaks out of iframe
      const successUrl = new URL(baseUrl);
      successUrl.searchParams.set('step', 'completion');
      successUrl.searchParams.set('success', 'true');
      successUrl.searchParams.set('plan', selectedPlan);
      successUrl.searchParams.set('target', '_top');
      
      // Add a query parameter to identify this is a redirect from payment
      successUrl.searchParams.set('from', 'payment');
      
      // Error redirect URL
      const errorUrl = new URL(baseUrl);
      errorUrl.searchParams.set('step', 'payment');
      errorUrl.searchParams.set('error', 'true');
      errorUrl.searchParams.set('plan', selectedPlan);
      errorUrl.searchParams.set('target', '_top');

      // Prepare payload based on whether user is logged in or not
      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: fullName || registrationData?.userData?.firstName + ' ' + registrationData?.userData?.lastName || '',
        email: email || user?.email || registrationData?.email || '',
        operationType,
        successRedirectUrl: successUrl.toString(),
        errorRedirectUrl: errorUrl.toString(),
        // Include registration data for account creation after payment
        registrationData: registrationData,
        // Add indicator we're in payment step to ensure proper flow
        paymentStep: true,
        // Generate a session ID to track this payment attempt
        paymentSessionId: crypto.randomUUID()
      };

      // Store current step in session storage
      const sessionData = sessionStorage.getItem('subscription_flow');
      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        parsedSession.selectedPlan = selectedPlan;
        parsedSession.step = 'payment';
        sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
      } else {
        sessionStorage.setItem('subscription_flow', JSON.stringify({
          selectedPlan,
          step: 'payment'
        }));
      }

      const { data, error } = await supabase.functions.invoke('cardcom-payment/create-payment', {
        body: payload
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        console.log('Payment URL created:', data);
        
        // Store temporary registration ID if available
        if (data.tempRegistrationId) {
          localStorage.setItem('temp_registration_id', data.tempRegistrationId);
        }
        
        // Store the lowProfileId for later verification
        if (data.lowProfileId) {
          sessionStorage.setItem('payment_lowprofile_id', data.lowProfileId);
        }
        
        // Ensure the URL has all required parameters for proper redirection
        const finalUrl = new URL(data.url);
        
        // Make sure breaking out of iframe parameters are added
        finalUrl.searchParams.set('target', '_top');
        finalUrl.searchParams.set('iframe', '0');
        finalUrl.searchParams.set('PopUp', '0');
        
        // Add the lowProfileId to the success URL
        let successRedirectUrl = finalUrl.searchParams.get('successRedirectUrl') || '';
        let errorRedirectUrl = finalUrl.searchParams.get('errorRedirectUrl') || '';
        
        // Update the success redirect URL to include the lowProfileId
        try {
          const successUrlObj = new URL(successRedirectUrl);
          successUrlObj.searchParams.set('lpId', data.lowProfileId);
          successUrlObj.searchParams.set('target', '_top');
          finalUrl.searchParams.set('successRedirectUrl', successUrlObj.toString());
        } catch (e) {
          console.error('Error processing success URL:', e);
          // Fallback to adding query parameters directly
          successRedirectUrl += `${successRedirectUrl.includes('?') ? '&' : '?'}lpId=${data.lowProfileId}&target=_top`;
          finalUrl.searchParams.set('successRedirectUrl', successRedirectUrl);
        }
        
        // Update the error redirect URL
        try {
          const errorUrlObj = new URL(errorRedirectUrl);
          errorUrlObj.searchParams.set('lpId', data.lowProfileId);
          errorUrlObj.searchParams.set('target', '_top');
          finalUrl.searchParams.set('errorRedirectUrl', errorUrlObj.toString());
        } catch (e) {
          console.error('Error processing error URL:', e);
          // Fallback to adding query parameters directly
          errorRedirectUrl += `${errorRedirectUrl.includes('?') ? '&' : '?'}lpId=${data.lowProfileId}&target=_top`;
          finalUrl.searchParams.set('errorRedirectUrl', errorRedirectUrl);
        }
        
        setPaymentUrl(finalUrl.toString());
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

  return {
    isLoading,
    paymentUrl,
    initiateCardcomPayment
  };
};
