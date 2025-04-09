
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

      // Create base URLs for success and error redirects
      const baseUrl = `${window.location.origin}/subscription`;
      
      // Critical fix: Make sure the success redirect URL goes to completion step and breaks out of the iframe
      const successUrl = `${baseUrl}?step=completion&success=true&plan=${selectedPlan}&target=_top`;
      const errorUrl = `${baseUrl}?step=payment&error=true&plan=${selectedPlan}&target=_top`;

      // Prepare payload based on whether user is logged in or not
      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: fullName || registrationData?.userData?.firstName + ' ' + registrationData?.userData?.lastName || '',
        email: email || user?.email || registrationData?.email || '',
        operationType,
        successRedirectUrl: successUrl,
        errorRedirectUrl: errorUrl,
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
        console.log('Payment URL created:', data);
        
        // Store temporary registration ID if available
        if (data.tempRegistrationId) {
          localStorage.setItem('temp_registration_id', data.tempRegistrationId);
        }
        
        // Ensure the target=_top parameter is present to force the iframe to break out to the top window
        const finalUrl = new URL(data.url);
        
        // Ensure we're always breaking out of the iframe on redirect
        finalUrl.searchParams.set('target', '_top');
        
        // Also ensure the success and error redirect URLs have target=_top
        let successRedirectUrl = finalUrl.searchParams.get('successRedirectUrl') || '';
        let errorRedirectUrl = finalUrl.searchParams.get('errorRedirectUrl') || '';
        
        if (successRedirectUrl && !successRedirectUrl.includes('target=_top')) {
          successRedirectUrl += (successRedirectUrl.includes('?') ? '&' : '?') + 'target=_top';
          finalUrl.searchParams.set('successRedirectUrl', successRedirectUrl);
        }
        
        if (errorRedirectUrl && !errorRedirectUrl.includes('target=_top')) {
          errorRedirectUrl += (errorRedirectUrl.includes('?') ? '&' : '?') + 'target=_top';
          finalUrl.searchParams.set('errorRedirectUrl', errorRedirectUrl);
        }
        
        // Add extra parameters to ensure we break out of any iframes
        finalUrl.searchParams.set('iframe', '0');
        finalUrl.searchParams.set('PopUp', '0');
        
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
